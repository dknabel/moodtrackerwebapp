import { describe, it, expect } from 'vitest'
import { CHART_COLORS } from './chartColors'

describe('CHART_COLORS', () => {
  it('uses the curated warm palette, never default blue', () => {
    const all = JSON.stringify(CHART_COLORS)
    expect(all).not.toMatch(/#2563eb|#16a34a|#7c3aed|#0891b2|#f59e0b/i)
    expect(CHART_COLORS.series[0]).toBe('#E5604A')
  })
})
