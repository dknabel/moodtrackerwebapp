// src/hooks/useNotificationSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { Reminder, Medication } from '../lib/database.types'

const mockAddListener = vi.fn((...args: unknown[]) => { void args; return Promise.resolve({ remove: vi.fn() }) })
vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => mockAddListener(...args) },
}))

const mockIsNativePlatform = vi.fn(() => true)
const mockSync = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
  syncScheduledNotifications: (...args: unknown[]) => mockSync(...args),
}))

const dailyReminder: Reminder = {
  id: 'r1', user_id: 'u1', kind: 'daily_log', medication_id: null,
  time: '21:00', label: 'Evening check-in', enabled: true, created_at: '',
}
const disabledReminder: Reminder = { ...dailyReminder, id: 'r2', enabled: false }
const medReminder: Reminder = {
  id: 'r3', user_id: 'u1', kind: 'medication', medication_id: 'm1',
  time: '08:00', label: null, enabled: true, created_at: '',
}
const med: Medication = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}

let remindersResponse: { data: Reminder[] | null }
let medicationsResponse: { data: Medication[] | null }
const mockRemindersSelect = vi.fn(() => Promise.resolve(remindersResponse))
const mockMedicationsEq = vi.fn(() => Promise.resolve(medicationsResponse))
const mockMedicationsSelect = vi.fn(() => ({ eq: mockMedicationsEq }))
const mockFrom = vi.fn((...args: unknown[]) => {
  const table = args[0] as string
  if (table === 'reminders') return { select: mockRemindersSelect }
  if (table === 'medications') return { select: mockMedicationsSelect }
  throw new Error(`unexpected table: ${table}`)
})
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
  remindersResponse = { data: [dailyReminder] }
  medicationsResponse = { data: [] }
})

describe('buildScheduledReminders', () => {
  it('builds a daily_log reminder with its label as the title', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([dailyReminder], [])
    expect(result).toEqual([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ])
  })

  it('falls back to a default title when a daily_log reminder has no label', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([{ ...dailyReminder, label: null }], [])
    expect(result[0].title).toBe('Daily check-in')
  })

  it('builds a medication reminder naming the matched medication', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([medReminder], [med])
    expect(result).toEqual([
      { id: 'r3', time: '08:00', title: 'Medication reminder', body: 'Time to take Lithium' },
    ])
  })

  it('excludes disabled reminders', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([dailyReminder, disabledReminder], [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })

  it('excludes a medication reminder whose medication is no longer active', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([medReminder], [])
    expect(result).toHaveLength(0)
  })
})

describe('useNotificationSync', () => {
  it('fetches fresh reminders/medications and syncs on mount when native', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    await waitFor(() => expect(mockSync).toHaveBeenCalledWith([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ]))
  })

  it('does not fetch or sync when not on a native platform', async () => {
    mockIsNativePlatform.mockReturnValue(false)
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('registers an appStateChange listener when native', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockAddListener).toHaveBeenCalledWith('appStateChange', expect.any(Function))
  })

  it('re-fetches and re-syncs with fresh data when the app comes to the foreground', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1))

    remindersResponse = { data: [] }
    const foregroundHandler = mockAddListener.mock.calls[0][1] as (state: { isActive: boolean }) => void
    foregroundHandler({ isActive: true })

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(2))
    expect(mockSync).toHaveBeenLastCalledWith([])
  })
})
