import type { DailyLog } from './database.types'

export interface CorrelationResult {
  groupA: { label: string; avg: number; count: number }
  groupB: { label: string; avg: number; count: number }
  hasEnoughData: boolean
}

export function computeCorrelation(
  logs: DailyLog[],
  yKey: keyof DailyLog,
  splitFn: (log: DailyLog) => boolean,
  labelA: string,
  labelB: string,
  minPoints = 5
): CorrelationResult {
  const withValue = (arr: DailyLog[]) => arr.filter(l => l[yKey] != null)
  const groupA = withValue(logs.filter(splitFn))
  const groupB = withValue(logs.filter(l => !splitFn(l)))

  const avg = (arr: DailyLog[]) =>
    arr.length === 0
      ? 0
      : parseFloat(
          (arr.reduce((sum, l) => sum + (l[yKey] as number), 0) / arr.length).toFixed(1)
        )

  return {
    groupA: { label: labelA, avg: avg(groupA), count: groupA.length },
    groupB: { label: labelB, avg: avg(groupB), count: groupB.length },
    hasEnoughData: groupA.length >= minPoints || groupB.length >= minPoints,
  }
}
