import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { format, subDays } from 'date-fns'
import { useStreaks } from './useStreaks'
import type { DailyLog, MedicationLog, Medication } from '../lib/database.types'

// Use date-fns format (local time) to match computeStreak's internal date formatting
const dayOffset = (n: number): string => format(subDays(new Date(), n), 'yyyy-MM-dd')

const makeLog = (daysAgo: number, exercised = false): DailyLog => ({
  id: String(daysAgo), user_id: 'u1', date: dayOffset(daysAgo),
  mood_rating: 7, mood_energy: 6, mood_anxiety: 3,
  meals_count: 3, exercised,
  sleep_hours: 7, sleep_quality: 4,
  bedtime: null, wake_time: null, tonight_bedtime: null, gratitude: null,
  created_at: '', updated_at: '',
})

const makeMed = (id: string): Medication => ({
  id, user_id: 'u1', name: 'Med', dose: '10mg',
  scheduled_time: null, active: true, created_at: '',
})

const makeMedLog = (daysAgo: number, medicationId: string, taken: boolean): MedicationLog => ({
  id: `${daysAgo}-${medicationId}`, user_id: 'u1',
  date: dayOffset(daysAgo), medication_id: medicationId,
  taken, taken_at: null, created_at: '',
})

describe('useStreaks', () => {
  it('counts current logging streak from today', () => {
    const logs = [makeLog(0), makeLog(1), makeLog(2)]
    const { result } = renderHook(() => useStreaks(logs, [], []))
    expect(result.current.logging.current).toBe(3)
  })

  it('breaks logging streak on gap', () => {
    const logs = [makeLog(0), makeLog(2)]
    const { result } = renderHook(() => useStreaks(logs, [], []))
    expect(result.current.logging.current).toBe(1)
  })

  it('keeps the current streak alive when today is not yet logged', () => {
    const logs = [makeLog(1), makeLog(2), makeLog(3)]
    const { result } = renderHook(() => useStreaks(logs, [], []))
    expect(result.current.logging.current).toBe(3)
  })

  it('current streak is 0 when neither today nor yesterday is logged', () => {
    const logs = [makeLog(2), makeLog(3)]
    const { result } = renderHook(() => useStreaks(logs, [], []))
    expect(result.current.logging.current).toBe(0)
  })

  it('computes longest logging streak', () => {
    const logs = [makeLog(0), makeLog(1), makeLog(3), makeLog(4), makeLog(5)]
    const { result } = renderHook(() => useStreaks(logs, [], []))
    expect(result.current.logging.longest).toBe(3)
  })

  it('counts exercise streak', () => {
    const logs = [makeLog(0, true), makeLog(1, true), makeLog(2, false)]
    const { result } = renderHook(() => useStreaks(logs, [], []))
    expect(result.current.exercise.current).toBe(2)
  })

  it('counts meds streak when all meds taken each day', () => {
    const med = makeMed('m1')
    const medLogs = [makeMedLog(0, 'm1', true), makeMedLog(1, 'm1', true)]
    const { result } = renderHook(() => useStreaks([], medLogs, [med]))
    expect(result.current.meds.current).toBe(2)
  })

  it('breaks meds streak when a med is not taken', () => {
    const med = makeMed('m1')
    const medLogs = [makeMedLog(0, 'm1', true), makeMedLog(1, 'm1', false)]
    const { result } = renderHook(() => useStreaks([], medLogs, [med]))
    expect(result.current.meds.current).toBe(1)
  })

  it('returns meds current=0 and longest=0 when no medications configured', () => {
    const { result } = renderHook(() => useStreaks([], [], []))
    expect(result.current.meds.current).toBe(0)
    expect(result.current.meds.longest).toBe(0)
  })
})
