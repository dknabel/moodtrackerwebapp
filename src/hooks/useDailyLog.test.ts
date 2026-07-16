import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDailyLog } from './useDailyLog'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) }))
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
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

  it('upserts changes to an existing log', async () => {
    const existingLog = { id: '1', date: '2026-06-20', mood_rating: 5 }
    mockMaybeSingle.mockResolvedValue({ data: existingLog, error: null })
    const updatedLog = { id: '1', date: '2026-06-20', mood_rating: 9 }
    mockSingle.mockResolvedValue({ data: updatedLog, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save({ mood_rating: 9 })
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ mood_rating: 9, user_id: 'user-123', date: '2026-06-20' }),
      { onConflict: 'user_id,date' }
    )
    expect(result.current.log).toEqual(updatedLog)
  })

  it('upserts a new log when none exists, avoiding a double-insert race', async () => {
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

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ mood_rating: 8, user_id: 'user-123', date: '2026-06-20' }),
      { onConflict: 'user_id,date' }
    )
    expect(result.current.log).toEqual(newLog)
  })

  it('surfaces an error from a failed upsert', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'duplicate key value' } })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saveResult: { error: string | null } | undefined
    await act(async () => {
      saveResult = await result.current.save({ mood_rating: 8 })
    })

    expect(saveResult).toEqual({ error: 'duplicate key value' })
    expect(result.current.log).toBeNull()
  })

  it('ignores a stale response that resolves after the date changed', async () => {
    let resolveOld!: (r: { data: unknown; error: null }) => void
    mockMaybeSingle.mockReturnValueOnce(new Promise(r => { resolveOld = r }))
    const freshLog = { id: 'b', date: '2026-06-21', mood_rating: 3 }
    mockMaybeSingle.mockResolvedValueOnce({ data: freshLog, error: null })

    const { result, rerender } = renderHook(({ date }) => useDailyLog(date), {
      initialProps: { date: '2026-06-20' },
    })
    rerender({ date: '2026-06-21' })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.log).toEqual(freshLog)

    await act(async () => {
      resolveOld({ data: { id: 'a', date: '2026-06-20', mood_rating: 9 }, error: null })
    })
    expect(result.current.log).toEqual(freshLog)
  })
})
