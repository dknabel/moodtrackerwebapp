import type { DailyLog } from './database.types'

export interface CorrelationResult {
  groupA: { label: string; avg: number; count: number }
  groupB: { label: string; avg: number; count: number }
  hasEnoughData: boolean
}

export interface CorrelationOptions {
  /** Split variable — logs where this is null are excluded from both groups. */
  xKey?: keyof DailyLog
  minPoints?: number
}

export function computeCorrelation(
  logs: DailyLog[],
  yKey: keyof DailyLog,
  splitFn: (log: DailyLog) => boolean,
  labelA: string,
  labelB: string,
  { xKey, minPoints = 3 }: CorrelationOptions = {}
): CorrelationResult {
  const eligible = logs.filter(l => l[yKey] != null && (xKey == null || l[xKey] != null))
  const groupA = eligible.filter(splitFn)
  const groupB = eligible.filter(l => !splitFn(l))

  const avg = (arr: DailyLog[]) =>
    arr.length === 0
      ? 0
      : parseFloat(
          (arr.reduce((sum, l) => sum + (l[yKey] as number), 0) / arr.length).toFixed(1)
        )

  return {
    groupA: { label: labelA, avg: avg(groupA), count: groupA.length },
    groupB: { label: labelB, avg: avg(groupB), count: groupB.length },
    hasEnoughData: groupA.length >= minPoints && groupB.length >= minPoints,
  }
}
