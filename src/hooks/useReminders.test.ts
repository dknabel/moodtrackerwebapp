import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReminders } from './useReminders'

const reminder1 = {
  id: 'r1', user_id: 'u1', kind: 'daily_log' as const, medication_id: null,
  time: '21:00', label: 'Evening check-in', enabled: true, created_at: '',
}

const mockSingle = vi.fn()
const mockSelectAfterInsert = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelectAfterInsert }))
const mockUpdateSingle = vi.fn()
const mockUpdateEq = vi.fn(() => ({ select: vi.fn(() => ({ single: mockUpdateSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
let deleteEqResponse: { error: { message: string } | null }
const mockDeleteEq = vi.fn(() => Promise.resolve(deleteEqResponse))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockOrder = vi.fn().mockResolvedValue({ data: [reminder1], error: null })
const mockSelectForFetch = vi.fn(() => ({ order: mockOrder }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelectForFetch,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockOrder.mockResolvedValue({ data: [reminder1], error: null })
  deleteEqResponse = { error: null }
})

describe('useReminders', () => {
  it('fetches reminders on mount', async () => {
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reminders).toEqual([reminder1])
  })

  it('returns empty array when no reminders exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reminders).toEqual([])
  })

  it('addReminder inserts and appends to state', async () => {
    mockSingle.mockResolvedValue({ data: reminder1, error: null })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addReminder({ kind: 'daily_log', medication_id: null, time: '21:00', label: 'Evening check-in' })
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'daily_log', time: '21:00', user_id: 'u1', enabled: true })
    )
  })

  it('updateReminder updates state and returns null on success', async () => {
    const updated = { ...reminder1, enabled: false }
    mockUpdateSingle.mockResolvedValue({ data: updated, error: null })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = 'sentinel'
    await act(async () => {
      returned = await result.current.updateReminder('r1', { enabled: false })
    })

    expect(returned).toBeNull()
    expect(result.current.reminders).toEqual([updated])
  })

  it('updateReminder returns the error and keeps state when the update fails', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = null
    await act(async () => {
      returned = await result.current.updateReminder('r1', { enabled: false })
    })

    expect(returned).toBe('update failed')
    expect(result.current.reminders).toEqual([reminder1])
  })

  it('deleteReminder removes reminder from state', async () => {
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteReminder('r1')
    })

    expect(result.current.reminders).toEqual([])
  })

  it('deleteReminder keeps the reminder and returns the error when delete fails', async () => {
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    deleteEqResponse = { error: { message: 'RLS violation' } }
    let returned: string | null = null
    await act(async () => {
      returned = await result.current.deleteReminder('r1')
    })

    expect(returned).toBe('RLS violation')
    expect(result.current.reminders).toEqual([reminder1])
  })
})
