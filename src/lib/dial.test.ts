import { describe, it, expect } from 'vitest'
import { valueFraction, polarToCartesian, arcPath, gaugeArc, deltaVsAverage } from './dial'

describe('valueFraction', () => {
  it('maps value into a clamped 0-1 fraction', () => {
    expect(valueFraction(5, 1, 10)).toBeCloseTo(4 / 9)
    expect(valueFraction(0, 1, 10)).toBe(0)
    expect(valueFraction(99, 1, 10)).toBe(1)
  })
  it('returns 0 for a degenerate range', () => {
    expect(valueFraction(5, 10, 10)).toBe(0)
  })
})

describe('polarToCartesian', () => {
  it('puts 0 degrees at 12 o-clock and 90 degrees at 3 o-clock', () => {
    const top = polarToCartesian(0, 0, 10, 0)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(-10)
    const right = polarToCartesian(0, 0, 10, 90)
    expect(right.x).toBeCloseTo(10)
    expect(right.y).toBeCloseTo(0)
  })
})

describe('arcPath / gaugeArc', () => {
  it('produces an SVG arc', () => {
    expect(arcPath(80, 80, 64, -135, 135)).toMatch(/^M .+ A 64 64 0 1 1 .+$/)
  })
  it('gaugeArc spans the full 270 degrees at max and stays at start at min', () => {
    const full = gaugeArc(10, 1, 10, 80, 80, 64)
    const empty = gaugeArc(1, 1, 10, 80, 80, 64)
    const endOf = (d: string) => d.trim().split(' ').slice(-2).map(Number)
    const fullEnd = endOf(full)
    const expected = polarToCartesian(80, 80, 64, 135)
    expect(fullEnd[0]).toBeCloseTo(expected.x)
    expect(fullEnd[1]).toBeCloseTo(expected.y)
    const emptyEnd = endOf(empty)
    const start = polarToCartesian(80, 80, 64, -135)
    expect(emptyEnd[0]).toBeCloseTo(start.x)
    expect(emptyEnd[1]).toBeCloseTo(start.y)
  })
})

describe('deltaVsAverage', () => {
  it('returns latest minus mean of recent', () => {
    expect(deltaVsAverage(8, [6, 7])).toBeCloseTo(1.5)
  })
  it('returns null with no recent values', () => {
    expect(deltaVsAverage(8, [])).toBeNull()
  })
})
