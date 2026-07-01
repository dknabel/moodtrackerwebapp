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
// update().eq(...) is awaited directly by deactivateMedication and chained
// with .select().single() by updateMedication, so the eq result supports both.
const mockUpdateSingle = vi.fn()
let updateEqResponse: { data: unknown; error: { message: string } | null }
const mockUpdateEq = vi.fn(() => ({
  select: vi.fn(() => ({ single: mockUpdateSingle })),
  then: (resolve: (r: typeof updateEqResponse) => void) => resolve(updateEqResponse),
}))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
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
  updateEqResponse = { data: null, error: null }
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

  it('surfaces fetch errors', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'fetch broke' } })
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('fetch broke')
  })

  it('deactivateMedication keeps the medication and returns the error when the update fails', async () => {
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    updateEqResponse = { data: null, error: { message: 'RLS violation' } }
    let returned: string | null = null
    await act(async () => {
      returned = await result.current.deactivateMedication('m1')
    })

    expect(returned).toBe('RLS violation')
    expect(result.current.medications).toEqual([med1])
  })

  it('updateMedication returns the error and keeps state when the update fails', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = null
    await act(async () => {
      returned = await result.current.updateMedication('m1', { name: 'X', dose: '1mg', scheduled_time: null })
    })

    expect(returned).toBe('update failed')
    expect(result.current.medications).toEqual([med1])
  })

  it('updateMedication updates state and returns null on success', async () => {
    const updated = { ...med1, name: 'Lithium ER' }
    mockUpdateSingle.mockResolvedValue({ data: updated, error: null })
    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = 'sentinel'
    await act(async () => {
      returned = await result.current.updateMedication('m1', { name: 'Lithium ER', dose: '300mg', scheduled_time: null })
    })

    expect(returned).toBeNull()
    expect(result.current.medications).toEqual([updated])
  })
})
