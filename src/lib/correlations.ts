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
