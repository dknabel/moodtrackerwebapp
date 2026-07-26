import type { CustomField, DailyLog, FieldValue } from './database.types'
import { numericValue } from './fields'

export interface OverlaySeries {
  key: string
  label: string
  points: Array<{ date: string; raw: number }>
  min: number
  max: number
}

/** Build the plottable overlay series: numeric fields with data, plus sleep hours/quality. */
export function buildOverlaySeries(
  fields: CustomField[],
  valuesByField: Map<string, FieldValue[]>,
  logs: DailyLog[],
): OverlaySeries[] {
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
}

/** Percent of [min, max], clamped to 0–100, rounded to 1 decimal. */
export function percentOfRange(raw: number, min: number, max: number): number {
  if (max === min) return 50
  const pct = ((raw - min) / (max - min)) * 100
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10
}

/** Merge series into recharts rows keyed by date (MM-DD), ascending. */
export function buildOverlayData(
  series: OverlaySeries[]
): Array<Record<string, string | number>> {
  const byDate = new Map<string, Record<string, string | number>>()
  for (const s of series) {
    for (const p of s.points) {
      const row = byDate.get(p.date) ?? { date: p.date.slice(5) }
      row[s.label] = percentOfRange(p.raw, s.min, s.max)
      row[`${s.label} raw`] = p.raw
      byDate.set(p.date, row)
    }
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, row]) => row)
}
