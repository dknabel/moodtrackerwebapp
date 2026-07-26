import { describe, it, expect } from 'vitest'
import { CHART_COLORS } from './chartColors'

describe('CHART_COLORS', () => {
  it('uses the instrument palette, never default recharts blues', () => {
    const all = JSON.stringify(CHART_COLORS)
    expect(all).not.toMatch(/#2563eb|#16a34a|#7c3aed|#0891b2|#f59e0b|#E5604A/i)
    expect(CHART_COLORS.series[0]).toBe('#FF9E40')
    expect(CHART_COLORS.series).toEqual([
      '#FF9E40',
      '#5FA8C7',
      '#7BC98C',
      '#B493E8',
      '#E06C7D',
      '#4EC9B0',
      '#E8D44D',
      '#E87AB8',
    ])
  })

  it('mirrors the dark CSS tokens for grid and ticks', () => {
    expect(CHART_COLORS.grid.dark).toBe('#262A31')
    expect(CHART_COLORS.tick.dark).toBe('#69707A')
    expect(CHART_COLORS.barInactive.dark).toBe('#262A31')
  })
})
