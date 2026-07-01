import { describe, it, expect } from 'vitest'
import { computeCorrelation } from './correlations'
import type { DailyLog } from './database.types'

const makeLog = (overrides: Partial<DailyLog>, idx = 0): DailyLog => ({
  id: String(idx), user_id: 'u1',
  date: `2026-06-${String(idx + 1).padStart(2, '0')}`,
  mood_rating: null, mood_energy: null, mood_anxiety: null,
  meals_count: null, exercised: null,
  sleep_hours: null, sleep_quality: null,
  bedtime: null, wake_time: null, tonight_bedtime: null, gratitude: null,
  created_at: '', updated_at: '',
  ...overrides,
})

describe('computeCorrelation', () => {
  it('computes average mood for each group', () => {
    const logs = [
      makeLog({ exercised: true, mood_rating: 8 }, 0),
      makeLog({ exercised: true, mood_rating: 6 }, 1),
      makeLog({ exercised: false, mood_rating: 4 }, 2),
      makeLog({ exercised: false, mood_rating: 5 }, 3),
      makeLog({ exercised: false, mood_rating: 3 }, 4),
    ]
    const result = computeCorrelation(logs, 'mood_rating', l => !!l.exercised, 'Exercised', 'Not exercised')
    expect(result.groupA.avg).toBe(7)
    expect(result.groupA.count).toBe(2)
    expect(result.groupB.avg).toBe(4)
    expect(result.groupB.count).toBe(3)
  })

  it('sets hasEnoughData true when both groups have >= 3 points', () => {
    const logs = [
      ...Array.from({ length: 3 }, (_, i) => makeLog({ exercised: true, mood_rating: 7 }, i)),
      ...Array.from({ length: 3 }, (_, i) => makeLog({ exercised: false, mood_rating: 5 }, i + 3)),
    ]
    const result = computeCorrelation(logs, 'mood_rating', l => !!l.exercised, 'Exercised', 'Not')
    expect(result.hasEnoughData).toBe(true)
  })

  it('sets hasEnoughData false when only one group has >= 3 points', () => {
    const logs = Array.from({ length: 5 }, (_, i) =>
      makeLog({ exercised: false, mood_rating: 5 }, i)
    )
    const result = computeCorrelation(logs, 'mood_rating', l => !!l.exercised, 'Exercised', 'Not')
    expect(result.hasEnoughData).toBe(false)
  })

  it('sets hasEnoughData false when both groups have < 3 points', () => {
    const logs = [
      makeLog({ exercised: true, mood_rating: 8 }, 0),
      makeLog({ exercised: false, mood_rating: 4 }, 1),
    ]
    const result = computeCorrelation(logs, 'mood_rating', l => !!l.exercised, 'Exercised', 'Not')
    expect(result.hasEnoughData).toBe(false)
  })

  it('excludes logs where xKey is null from both groups', () => {
    // Days with no sleep data must not be counted as "<7 hours" days.
    const logs = [
      makeLog({ sleep_hours: 8, mood_rating: 8 }, 0),
      makeLog({ sleep_hours: 8, mood_rating: 8 }, 1),
      makeLog({ sleep_hours: 8, mood_rating: 8 }, 2),
      makeLog({ sleep_hours: 5, mood_rating: 4 }, 3),
      makeLog({ sleep_hours: null, mood_rating: 2 }, 4),
      makeLog({ sleep_hours: null, mood_rating: 2 }, 5),
    ]
    const result = computeCorrelation(
      logs, 'mood_rating', l => (l.sleep_hours ?? 0) >= 7, '7+ hours', '<7 hours',
      { xKey: 'sleep_hours' }
    )
    expect(result.groupA.count).toBe(3)
    expect(result.groupB.count).toBe(1)
    expect(result.groupB.avg).toBe(4)
  })

  it('excludes logs where yKey is null', () => {
    const logs = [
      makeLog({ exercised: true, mood_rating: null }, 0),
      makeLog({ exercised: true, mood_rating: 8 }, 1),
      makeLog({ exercised: false, mood_rating: 4 }, 2),
      makeLog({ exercised: false, mood_rating: 4 }, 3),
      makeLog({ exercised: false, mood_rating: 4 }, 4),
    ]
    const result = computeCorrelation(logs, 'mood_rating', l => !!l.exercised, 'Exercised', 'Not')
    expect(result.groupA.count).toBe(1)
    expect(result.groupA.avg).toBe(8)
  })
})
