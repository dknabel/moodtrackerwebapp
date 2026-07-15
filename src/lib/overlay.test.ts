import { describe, it, expect } from 'vitest'
import { percentOfRange, buildOverlayData, type OverlaySeries } from './overlay'

describe('percentOfRange', () => {
  it('maps min→0, max→100, midpoint→50 (1 decimal)', () => {
    expect(percentOfRange(1, 1, 10)).toBe(0)
    expect(percentOfRange(10, 1, 10)).toBe(100)
    expect(percentOfRange(4, 1, 10)).toBe(33.3)
  })
  it('clamps out-of-range values and handles a degenerate range', () => {
    expect(percentOfRange(14, 0, 12)).toBe(100)
    expect(percentOfRange(-1, 0, 12)).toBe(0)
    expect(percentOfRange(3, 3, 3)).toBe(50)
  })
})

describe('buildOverlayData', () => {
  it('merges series by date with percent and raw keys', () => {
    const stress: OverlaySeries = {
      key: 'field:f1', label: 'Stress', min: 1, max: 10,
      points: [{ date: '2026-07-01', raw: 1 }, { date: '2026-07-02', raw: 10 }],
    }
    const coffee: OverlaySeries = {
      key: 'field:f2', label: 'Coffee', min: 0, max: 4,
      points: [{ date: '2026-07-02', raw: 2 }],
    }
    expect(buildOverlayData([stress, coffee])).toEqual([
      { date: '07-01', Stress: 0, 'Stress raw': 1 },
      { date: '07-02', Stress: 100, 'Stress raw': 10, Coffee: 50, 'Coffee raw': 2 },
    ])
  })
})
