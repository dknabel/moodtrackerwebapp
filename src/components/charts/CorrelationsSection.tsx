import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { CustomField, DailyLog, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'
import { CHART_COLORS } from '../../lib/chartColors'
import { compareGroups, median, type Point } from '../../lib/correlations'
import { eyebrow } from '../../lib/styles'

interface Props {
  fields: CustomField[]
  valuesByField: Map<string, FieldValue[]>
  logs: DailyLog[]
  isDark: boolean
}

interface Candidate {
  title: string
  splitFn: (p: Point) => boolean
  labelA: string
  labelB: string
  points: Point[]
  xAxisLabel: string
}

export function CorrelationsSection({ fields, valuesByField, logs, isDark }: Props) {
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const blue = CHART_COLORS.series[0]
  const gray = isDark ? CHART_COLORS.barInactive.dark : CHART_COLORS.barInactive.light

  const primary = fields.find(f => f.type === 'slider') ?? null

  const cards = useMemo(() => {
    if (!primary) return []
    const yByDate = new Map<string, number>()
    for (const v of valuesByField.get(primary.id) ?? []) {
      const n = numericValue(primary, v.value)
      if (n !== null) yByDate.set(v.date, n)
    }

    const candidates: Candidate[] = []

    const addNumericCandidate = (
      title: string, xAxisLabel: string, xs: Array<{ date: string; x: number }>,
      fixedSplit?: { at: number; labelA: string; labelB: string }
    ) => {
      const points = xs
        .filter(({ date }) => yByDate.has(date))
        .map(({ date, x }) => ({ x, y: yByDate.get(date)! }))
      if (points.length === 0) return
      const split = fixedSplit ?? (() => {
        const m = median(points.map(p => p.x))
        return { at: m, labelA: `≥ ${m}`, labelB: `< ${m}` }
      })()
      candidates.push({
        title, xAxisLabel, points,
        splitFn: p => p.x >= split.at,
        labelA: split.labelA, labelB: split.labelB,
      })
    }

    for (const f of fields) {
      if (f.id === primary.id || (f.type !== 'slider' && f.type !== 'number' && f.type !== 'toggle')) continue
      const xs = (valuesByField.get(f.id) ?? [])
        .map(v => ({ date: v.date, x: numericValue(f, v.value) }))
        .filter((e): e is { date: string; x: number } => e.x !== null)
      if (f.type === 'toggle') {
        addNumericCandidate(`${f.name} vs ${primary.name}`, `${f.name} (1=yes, 0=no)`, xs,
          { at: 1, labelA: 'Yes', labelB: 'No' })
      } else {
        addNumericCandidate(`${f.name} vs ${primary.name}`, f.name, xs)
      }
    }

    addNumericCandidate(
      `Sleep hours vs ${primary.name}`, 'Sleep hours',
      logs.filter(l => l.sleep_hours != null).map(l => ({ date: l.date, x: l.sleep_hours! })),
      { at: 7, labelA: '7+ hours', labelB: '<7 hours' }
    )
    addNumericCandidate(
      `Sleep quality vs ${primary.name}`, 'Sleep quality (1-5)',
      logs.filter(l => l.sleep_quality != null).map(l => ({ date: l.date, x: l.sleep_quality! })),
      { at: 3, labelA: 'Quality 3-5', labelB: 'Quality 1-2' }
    )

    return candidates
      .map(c => ({
        cfg: c,
        result: compareGroups(c.points, c.splitFn, c.labelA, c.labelB),
        pA: c.points.filter(c.splitFn),
        pB: c.points.filter(p => !c.splitFn(p)),
      }))
      .filter(c => c.result.hasEnoughData)
  }, [fields, valuesByField, logs, primary])

  if (!primary || cards.length === 0) return null

  const yDomain: [number, number] = [primary.config.min ?? 1, primary.config.max ?? 10]

  return (
    <div className="flex flex-col gap-6">
      <h2 className={eyebrow}>Correlations</h2>
      {cards.map(({ cfg, result, pA, pB }) => (
        <div key={cfg.title} className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
          <p className="font-medium text-ink">{cfg.title}</p>
          <p className="text-sm text-muted">
            {result.groupA.label}: avg {result.groupA.avg} ({result.groupA.count} days) —{' '}
            {result.groupB.label}: avg {result.groupB.avg} ({result.groupB.count} days)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ScatterChart>
              <XAxis dataKey="x" name={cfg.xAxisLabel} tick={{ fontSize: 11, fill: tickColor }} stroke={tickColor} />
              <YAxis dataKey="y" name={primary.name} domain={yDomain} tick={{ fontSize: 11, fill: tickColor }} stroke={tickColor} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name={result.groupA.label} data={pA} fill={blue} />
              <Scatter name={result.groupB.label} data={pB} fill={gray} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
