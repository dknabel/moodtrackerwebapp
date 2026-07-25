import { describe, it, expect } from 'vitest'
import { buildMonthCells, valueToOpacity } from './heatmap'

const JULY_2026 = new Date(2026, 6, 15) // any day in July 2026

describe('valueToOpacity', () => {
  it('maps the range into 0.15-1', () => {
    expect(valueToOpacity(1, 1, 10)).toBeCloseTo(0.15)
    expect(valueToOpacity(10, 1, 10)).toBeCloseTo(1)
    expect(valueToOpacity(0, 1, 10)).toBeCloseTo(0.15) // clamped below
  })
  it('returns 1 for a degenerate range', () => {
    expect(valueToOpacity(5, 5, 5)).toBe(1)
  })
})

describe('buildMonthCells', () => {
  const today = new Date(2026, 6, 25)
  const values = new Map([['2026-07-03', 8]])

  it('covers the whole month in 7-slot weeks starting Sunday', () => {
    const weeks = buildMonthCells(JULY_2026, values, today)
    for (const week of weeks) expect(week).toHaveLength(7)
    const dates = weeks.flat().filter(c => c !== null).map(c => c!.date)
    expect(dates[0]).toBe('2026-07-01')
    expect(dates[dates.length - 1]).toBe('2026-07-31')
    // 2026-07-01 is a Wednesday → 3 leading nulls in week 1
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0][3]!.date).toBe('2026-07-01')
  })

  it('maps values to opacity and zeroes days without data', () => {
    const weeks = buildMonthCells(JULY_2026, values, today)
    const cells = weeks.flat().filter(c => c !== null)
    const withValue = cells.find(c => c!.date === '2026-07-03')!
    expect(withValue.value).toBe(8)
    expect(withValue.opacity).toBeGreaterThan(0)
    const withoutValue = cells.find(c => c!.date === '2026-07-04')!
    expect(withoutValue.value).toBeNull()
    expect(withoutValue.opacity).toBe(0)
  })

  it('zeroes future days', () => {
    const weeks = buildMonthCells(JULY_2026, values, today)
    const cells = weeks.flat().filter(c => c !== null)
    const future = cells.find(c => c!.date === '2026-07-31')!
    expect(future.value).toBeNull()
    expect(future.opacity).toBe(0)
  })
})
