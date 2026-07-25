import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { CustomField, DailyLog, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'
import { buildOverlayData, type OverlaySeries } from '../../lib/overlay'
import { CHART_COLORS } from '../../lib/chartColors'
import { ChartTooltip } from './ChartTooltip'
import { Section } from '../ui/Section'

interface Props {
  index?: number
  fields: CustomField[]
  valuesByField: Map<string, FieldValue[]>
  logs: DailyLog[]
  isDark: boolean
}

const COLORS = CHART_COLORS.series
const MAX_SERIES = 3

export function OverlaySection({ index: overlayIndex, fields, valuesByField, logs, isDark }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  const available = useMemo<OverlaySeries[]>(() => {
    const series: OverlaySeries[] = []
    for (const f of fields) {
      if (f.type !== 'slider' && f.type !== 'number') continue
      const points = (valuesByField.get(f.id) ?? [])
        .map(v => ({ date: v.date, raw: numericValue(f, v.value) }))
        .filter((p): p is { date: string; raw: number } => p.raw !== null)
      if (points.length === 0) continue
      const min = f.type === 'slider' ? (f.config.min ?? 1) : 0
      const max = f.type === 'slider'
        ? (f.config.max ?? 10)
        : Math.max(1, ...points.map(p => p.raw))
      series.push({ key: `field:${f.id}`, label: f.name, points, min, max })
    }
    const sleepHours = logs
      .filter(l => l.sleep_hours != null)
      .map(l => ({ date: l.date, raw: l.sleep_hours! }))
    if (sleepHours.length > 0) {
      series.push({ key: 'sleep_hours', label: 'Sleep hours', points: sleepHours, min: 0, max: 12 })
    }
    const sleepQuality = logs
      .filter(l => l.sleep_quality != null)
      .map(l => ({ date: l.date, raw: l.sleep_quality! }))
    if (sleepQuality.length > 0) {
      series.push({ key: 'sleep_quality', label: 'Sleep quality', points: sleepQuality, min: 1, max: 5 })
    }
    return series
  }, [fields, valuesByField, logs])

  const colorByKey = useMemo(
    () => new Map(available.map((s, i) => [s.key, COLORS[i % COLORS.length]])),
    [available]
  )

  if (available.length < 2) return null

  const toggle = (key: string) =>
    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : prev.length >= MAX_SERIES ? prev : [...prev, key]
    )

  const chosen = available.filter(s => selected.includes(s.key))
  const data = buildOverlayData(chosen)
  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light

  return (
    <Section index={overlayIndex} title="Compare">
      <div className="flex flex-wrap gap-2">
        {available.map(s => {
          const isOn = selected.includes(s.key)
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                isOn
                  ? 'bg-signal text-bg border-signal'
                  : 'border-line text-ink hover:border-ink'
              }`}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: colorByKey.get(s.key) }}
              />
              {s.label}
            </button>
          )
        })}
      </div>
      {chosen.length < 2 ? (
        <p className="text-xs text-faint">
          Pick 2–{MAX_SERIES} series to compare (scaled to each one's own range).
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono Variable', fill: tickColor }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono Variable', fill: tickColor }}
              unit="%"
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono Variable' }} />
            {chosen.map(s => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.label}
                stroke={colorByKey.get(s.key)}
                strokeWidth={2}
                dot={{ r: 2, fill: colorByKey.get(s.key), strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </Section>
  )
}
