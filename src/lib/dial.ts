export function valueFraction(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg)
  const end = polarToCartesian(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/** 270° gauge starting at −135° (7:30 position) sweeping clockwise. */
export function gaugeArc(value: number, min: number, max: number, cx: number, cy: number, r: number): string {
  return arcPath(cx, cy, r, -135, -135 + 270 * valueFraction(value, min, max))
}

export function deltaVsAverage(latest: number, recent: number[]): number | null {
  if (recent.length === 0) return null
  return latest - recent.reduce((a, b) => a + b, 0) / recent.length
}
