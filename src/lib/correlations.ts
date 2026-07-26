import type { CustomField, DailyLog, FieldValue } from './database.types'
import { numericValue } from './fields'

export interface Point {
  x: number
  y: number
}

export interface ComparisonResult {
  groupA: { label: string; avg: number; count: number }
  groupB: { label: string; avg: number; count: number }
  hasEnoughData: boolean
}

export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function compareGroups(
  points: Point[],
  splitFn: (p: Point) => boolean,
  labelA: string,
  labelB: string,
  minPoints = 3
): ComparisonResult {
  const groupA = points.filter(splitFn)
  const groupB = points.filter(p => !splitFn(p))

  const avg = (arr: Point[]) =>
    arr.length === 0
      ? 0
      : parseFloat((arr.reduce((sum, p) => sum + p.y, 0) / arr.length).toFixed(1))

  return {
    groupA: { label: labelA, avg: avg(groupA), count: groupA.length },
    groupB: { label: labelB, avg: avg(groupB), count: groupB.length },
    hasEnoughData: groupA.length >= minPoints && groupB.length >= minPoints,
  }
}

interface Candidate {
  title: string
  splitFn: (p: Point) => boolean
  labelA: string
  labelB: string
  points: Point[]
  xAxisLabel: string
}

export interface CorrelationCard {
  cfg: Candidate
  result: ComparisonResult
  pA: Point[]
  pB: Point[]
}

/** Build the comparison cards that have enough data on both sides of the split. */
export function buildCorrelationCards(
  fields: CustomField[],
  valuesByField: Map<string, FieldValue[]>,
  logs: DailyLog[],
): CorrelationCard[] {
  const primary = fields.find(f => f.type === 'slider') ?? null
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
}
