import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMedicationLogs } from './useMedicationLogs'

const log1: import('../lib/database.types').MedicationLog = {
  id: 'l1', user_id: 'u1', date: '2026-06-24',
  medication_id: 'm1', taken: false, taken_at: null, created_at: '',
}
const log1Taken = { ...log1, taken: true, taken_at: '08:30' }

const mockSingle = vi.fn()
const mockSelectAfterUpsert = vi.fn(() => ({ single: mockSingle }))
const mockUpsert = vi.fn(() => ({ select: mockSelectAfterUpsert }))

// chain: .select('*').eq('date', date) → Promise
const mockSelectForFetch = vi.fn(() => ({
  eq: vi.fn().mockResolvedValue({ data: [log1], error: null }),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelectForFetch,
      upsert: mockUpsert,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('useMedicationLogs', () => {
  it('fetches logs for the given date', async () => {
    mockSelectForFetch.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [log1], error: null }),
    })
    const { result } = renderHook(() => useMedicationLogs('2026-06-24'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual([log1])
  })

  it('returns empty array when no logs exist', async () => {
    mockSelectForFetch.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const { result } = renderHook(() => useMedicationLogs('2026-06-24'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual([])
  })

  it('setTaken upserts and updates local state', async () => {
    mockSelectForFetch.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [log1], error: null }),
    })
    mockSingle.mockResolvedValue({ data: log1Taken, error: null })

    const { result } = renderHook(() => useMedicationLogs('2026-06-24'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setTaken('m1', true, '08:30')
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ medication_id: 'm1', taken: true, taken_at: '08:30', date: '2026-06-24' }),
      expect.objectContaining({ onConflict: 'user_id,date,medication_id' })
    )
    expect(result.current.logs[0].taken).toBe(true)
  })
})
