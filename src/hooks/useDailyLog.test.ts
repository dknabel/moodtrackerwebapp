import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDailyLog } from './useDailyLog'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('useDailyLog', () => {
  it('fetches the log for the given date', async () => {
    const mockLog = { id: '1', date: '2026-06-20', mood_rating: 7 }
    mockMaybeSingle.mockResolvedValue({ data: mockLog, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.log).toEqual(mockLog)
  })

  it('returns null log when no entry exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.log).toBeNull()
  })

  it('sets error state when fetch fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Network error' } })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Network error')
    expect(result.current.log).toBeNull()
  })

  it('updates an existing log', async () => {
    const existingLog = { id: '1', date: '2026-06-20', mood_rating: 5 }
    mockMaybeSingle.mockResolvedValue({ data: existingLog, error: null })
    const updatedLog = { id: '1', date: '2026-06-20', mood_rating: 9 }
    mockSingle.mockResolvedValue({ data: updatedLog, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save({ mood_rating: 9 })
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ mood_rating: 9, user_id: 'user-123', date: '2026-06-20' })
    )
    expect(result.current.log).toEqual(updatedLog)
  })

  it('inserts a new log when none exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const newLog = { id: '2', date: '2026-06-20', mood_rating: 8 }
    mockSingle.mockResolvedValue({ data: newLog, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save({ mood_rating: 8, mood_energy: null, mood_anxiety: null,
        meals_count: null, exercised: null, sleep_hours: null, sleep_quality: null,
        bedtime: null, wake_time: null })
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ mood_rating: 8, user_id: 'user-123', date: '2026-06-20' })
    )
    expect(result.current.log).toEqual(newLog)
  })
})
