import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMedicationLogsBulk } from './useMedicationLogsBulk'

const logs = [
  { id: 'l1', user_id: 'u1', date: '2026-06-01', medication_id: 'm1', taken: true, taken_at: null, created_at: '' },
  { id: 'l2', user_id: 'u1', date: '2026-06-02', medication_id: 'm1', taken: false, taken_at: null, created_at: '' },
]

const mockLte = vi.fn().mockResolvedValue({ data: logs, error: null })
const mockGte = vi.fn(() => ({ lte: mockLte }))
const mockSelect = vi.fn(() => ({ gte: mockGte }))

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn(() => ({ select: mockSelect })) },
}))

beforeEach(() => vi.clearAllMocks())

describe('useMedicationLogsBulk', () => {
  it('fetches medication logs for the given date range', async () => {
    const { result } = renderHook(() => useMedicationLogsBulk('2026-06-01', '2026-06-30'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual(logs)
  })

  it('returns empty array when no logs exist', async () => {
    mockLte.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useMedicationLogsBulk('2026-06-01', '2026-06-30'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual([])
  })
})
