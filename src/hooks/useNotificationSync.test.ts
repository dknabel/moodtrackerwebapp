import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { Reminder, Medication } from '../lib/database.types'

const mockAddListener = vi.fn(() => ({ remove: vi.fn() }))
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

let remindersState: Reminder[]
let medicationsState: Medication[]
vi.mock('./useReminders', () => ({
  useReminders: () => ({ reminders: remindersState }),
}))
vi.mock('./useMedications', () => ({
  useMedications: () => ({ medications: medicationsState }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
  remindersState = [dailyReminder]
  medicationsState = []
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
})

describe('useNotificationSync', () => {
  it('syncs scheduled notifications on mount when native', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockSync).toHaveBeenCalledWith([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ])
  })

  it('does not sync when not on a native platform', async () => {
    mockIsNativePlatform.mockReturnValue(false)
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('registers an appStateChange listener when native', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockAddListener).toHaveBeenCalledWith('appStateChange', expect.any(Function))
  })
})
