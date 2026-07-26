import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { CustomField, DailyLog, FieldValue } from '../../lib/database.types'
import { CHART_COLORS } from '../../lib/chartColors'
import { buildCorrelationCards } from '../../lib/correlations'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

interface Props {
  index: number
  fields: CustomField[]
  valuesByField: Map<string, FieldValue[]>
  logs: DailyLog[]
  isDark: boolean
}

export function CorrelationsSection({ index, fields, valuesByField, logs, isDark }: Props) {
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const signalColor = CHART_COLORS.series[0]
  const gray = isDark ? CHART_COLORS.barInactive.dark : CHART_COLORS.barInactive.light

  const primary = fields.find(f => f.type === 'slider') ?? null

  const cards = useMemo(
    () => buildCorrelationCards(fields, valuesByField, logs),
    [fields, valuesByField, logs]
  )

  if (!primary || cards.length === 0) return null

  const yDomain: [number, number] = [primary.config.min ?? 1, primary.config.max ?? 10]

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
        {String(index).padStart(2, '0')} / Comparisons
      </h2>
      {cards.map(({ cfg, result, pA, pB }) => (
        <div key={cfg.title} className="border-t border-line pt-4 flex flex-col gap-3">
          <p className="font-medium text-ink">{cfg.title}</p>
          <p className="font-mono text-xs tnum text-muted">
            {result.groupA.label}: avg {result.groupA.avg} ({result.groupA.count} days) —{' '}
            {result.groupB.label}: avg {result.groupB.avg} ({result.groupB.count} days)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ScatterChart>
              <XAxis dataKey="x" name={cfg.xAxisLabel} tick={{ fontSize: 11, fontFamily: MONO, fill: tickColor }} stroke={tickColor} />
              <YAxis dataKey="y" name={primary.name} domain={yDomain} tick={{ fontSize: 11, fontFamily: MONO, fill: tickColor }} stroke={tickColor} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: MONO }} />
              <Scatter name={result.groupA.label} data={pA} fill={signalColor} />
              <Scatter name={result.groupB.label} data={pB} fill={gray} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
