export interface OverlaySeries {
  key: string
  label: string
  points: Array<{ date: string; raw: number }>
  min: number
  max: number
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
