import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetPending = vi.fn()
const mockCancel = vi.fn()
const mockSchedule = vi.fn()
const mockRequestPermissions = vi.fn()

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    getPending: (...args: unknown[]) => mockGetPending(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    schedule: (...args: unknown[]) => mockSchedule(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}))

import { syncScheduledNotifications, requestNotificationPermission, isNativePlatform } from './notifications'
import { Capacitor } from '@capacitor/core'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetPending.mockResolvedValue({ notifications: [] })
  mockCancel.mockResolvedValue(undefined)
  mockSchedule.mockResolvedValue(undefined)
})

describe('isNativePlatform', () => {
  it('delegates to Capacitor.isNativePlatform', () => {
    expect(isNativePlatform()).toBe(true)
    expect(Capacitor.isNativePlatform).toHaveBeenCalled()
  })
})

describe('requestNotificationPermission', () => {
  it('returns true when permission is granted', async () => {
    mockRequestPermissions.mockResolvedValue({ display: 'granted' })
    await expect(requestNotificationPermission()).resolves.toBe(true)
  })

  it('returns false when permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ display: 'denied' })
    await expect(requestNotificationPermission()).resolves.toBe(false)
  })
})

describe('syncScheduledNotifications', () => {
  it('cancels existing pending notifications before scheduling', async () => {
    mockGetPending.mockResolvedValue({ notifications: [{ id: 1 }, { id: 2 }] })

    await syncScheduledNotifications([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ])

    expect(mockCancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 2 }] })
  })

  it('skips cancel when there is nothing pending', async () => {
    mockGetPending.mockResolvedValue({ notifications: [] })
    await syncScheduledNotifications([])
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('schedules one notification per reminder with hour/minute parsed from time', async () => {
    await syncScheduledNotifications([
      { id: 'r1', time: '21:05', title: 'Evening check-in', body: "Time to log today's mood" },
      { id: 'r2', time: '08:00', title: 'Medication reminder', body: 'Time to take Lithium' },
    ])

    expect(mockSchedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 1,
          title: 'Evening check-in',
          body: "Time to log today's mood",
          schedule: { on: { hour: 21, minute: 5 }, allowWhileIdle: true },
        },
        {
          id: 2,
          title: 'Medication reminder',
          body: 'Time to take Lithium',
          schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true },
        },
      ],
    })
  })

  it('does not call schedule when there are no reminders', async () => {
    await syncScheduledNotifications([])
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})
