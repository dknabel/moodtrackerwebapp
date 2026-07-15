import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { CustomField, DailyLog, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'
import { buildOverlayData, type OverlaySeries } from '../../lib/overlay'

interface Props {
  fields: CustomField[]
  valuesByField: Map<string, FieldValue[]>
  logs: DailyLog[]
  isDark: boolean
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b']
const MAX_SERIES = 3

export function OverlaySection({ fields, valuesByField, logs, isDark }: Props) {
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

  if (available.length < 2) return null

  const toggle = (key: string) =>
    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : prev.length >= MAX_SERIES ? prev : [...prev, key]
    )

  const chosen = available.filter(s => selected.includes(s.key))
  const data = buildOverlayData(chosen)
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Compare</h2>
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
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      {chosen.length < 2 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Pick 2–{MAX_SERIES} series to compare (scaled to each one's own range).
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: tickColor }} unit="%" />
            <Tooltip
              formatter={(_value, name, item) => {
                const payload = (item as { payload: Record<string, number | string> }).payload
                return [payload[`${String(name)} raw`], name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chosen.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.label}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
