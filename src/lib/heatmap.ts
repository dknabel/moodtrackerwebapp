import { startOfMonth, endOfMonth, addDays, format, isAfter } from 'date-fns'

export interface HeatmapCell {
  date: string
  value: number | null
  opacity: number
}

export function valueToOpacity(value: number, min: number, max: number): number {
  if (max <= min) return 1
  const f = Math.min(1, Math.max(0, (value - min) / (max - min)))
  return 0.15 + 0.85 * f
}

export function buildMonthCells(
  month: Date,
  valuesByDate: Map<string, number>,
  today: Date = new Date(),
  min = 1,
  max = 10,
): Array<Array<HeatmapCell | null>> {
  const first = startOfMonth(month)
  const last = endOfMonth(month)
  const weeks: Array<Array<HeatmapCell | null>> = []
  let week: Array<HeatmapCell | null> = Array(first.getDay()).fill(null)
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const date = format(d, 'yyyy-MM-dd')
    const raw = valuesByDate.get(date)
    const value = raw !== undefined && !isAfter(d, today) ? raw : null
    week.push({ date, value, opacity: value === null ? 0 : valueToOpacity(value, min, max) })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}
