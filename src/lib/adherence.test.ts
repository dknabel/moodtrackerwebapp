import { describe, it, expect } from 'vitest'
import { buildAdherenceDays } from './adherence'

const today = new Date(2026, 6, 25) // 2026-07-25
const logs = [
  { date: '2026-07-25', medication_id: 'm1', taken: true },
  { date: '2026-07-23', medication_id: 'm1', taken: false },
  { date: '2026-07-24', medication_id: 'm2', taken: true },
]

describe('buildAdherenceDays', () => {
  it('returns trailing days ascending, filtered to the medication', () => {
    const days = buildAdherenceDays(logs, 'm1', 3, today)
    expect(days.map(d => d.date)).toEqual(['2026-07-23', '2026-07-24', '2026-07-25'])
    expect(days.map(d => d.taken)).toEqual([false, null, true])
  })
  it('returns all nulls when the medication has no logs', () => {
    const days = buildAdherenceDays(logs, 'm3', 2, today)
    expect(days.map(d => d.taken)).toEqual([null, null])
  })
})
