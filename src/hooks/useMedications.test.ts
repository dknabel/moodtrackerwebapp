import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMedications } from './useMedications'

const med1 = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}

const mockSingle = vi.fn()
const mockSelectAfterInsert = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelectAfterInsert }))
const mockSelectAfterUpdate = vi.fn(() => ({ single: mockSingle }))
const mockEqForUpdate = vi.fn(() => ({ select: mockSelectAfterUpdate }))
const mockEqForDeactivate = vi.fn().mockResolvedValue({ data: null, error: null })
const mockUpdate = vi.fn()
const mockOrder = vi.fn().mockResolvedValue({ data: [med1], error: null })
const mockEqForFetch = vi.fn(() => ({ order: mockOrder }))
const mockSelectForFetch = vi.fn(() => ({ eq: mockEqForFetch }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelectForFetch,
      insert: mockInsert,
      update: mockUpdate,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockOrder.mockResolvedValue({ data: [med1], error: null })
  mockUpdate.mockImplementation(() => ({ eq: mockEqForDeactivate }))
})

describe('useMedications', () => {
  it('fetches active medications on mount', async () => {
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.medications).toEqual([med1])
  })

  it('returns empty array when no medications exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.medications).toEqual([])
  })

  it('addMedication inserts and appends to state', async () => {
    mockSingle.mockResolvedValue({ data: med1, error: null })
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addMedication({ name: 'Lithium', dose: '300mg', scheduled_time: '08:00' })
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lithium', dose: '300mg', user_id: 'u1', active: true })
    )
  })

  it('deactivateMedication removes medication from state', async () => {
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deactivateMedication('m1')
    })

    expect(result.current.medications).toEqual([])
  })
})
