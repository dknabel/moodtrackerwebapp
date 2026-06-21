import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLogs } from './useLogs'

const mockLogs = [
  { id: '1', date: '2026-06-18', mood_rating: 6, exercised: true, sleep_hours: 7 },
  { id: '2', date: '2026-06-19', mood_rating: 8, exercised: false, sleep_hours: 8 },
]

const mockOrder = vi.fn().mockResolvedValue({ data: mockLogs, error: null })
const mockLte = vi.fn(() => ({ order: mockOrder }))
const mockGte = vi.fn(() => ({ lte: mockLte }))
const mockSelect = vi.fn(() => ({ gte: mockGte }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: mockSelect })),
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('useLogs', () => {
  it('fetches logs for the given date range', async () => {
    const { result } = renderHook(() => useLogs('2026-06-18', '2026-06-19'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual(mockLogs)
  })

  it('returns empty array when no logs exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useLogs('2026-06-01', '2026-06-10'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual([])
  })
})
