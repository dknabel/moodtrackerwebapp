import { describe, it, expect } from 'vitest'
import { compareGroups, median, type Point } from './correlations'

const p = (x: number, y: number): Point => ({ x, y })

describe('median', () => {
  it('returns the middle value for odd counts and the mean of middles for even', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([5])).toBe(5)
  })
})

describe('compareGroups', () => {
  const points = [p(1, 8), p(1, 6), p(1, 7), p(0, 4), p(0, 5), p(0, 3)]

  it('averages each side of the split to 1 decimal', () => {
    const r = compareGroups(points, pt => pt.x === 1, 'Yes', 'No')
    expect(r.groupA).toEqual({ label: 'Yes', avg: 7, count: 3 })
    expect(r.groupB).toEqual({ label: 'No', avg: 4, count: 3 })
    expect(r.hasEnoughData).toBe(true)
  })

  it('needs minPoints on both sides', () => {
    const r = compareGroups(points.slice(0, 4), pt => pt.x === 1, 'Yes', 'No')
    expect(r.hasEnoughData).toBe(false)
  })
})
