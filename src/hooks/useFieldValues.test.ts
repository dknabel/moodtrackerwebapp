import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFieldValues } from './useFieldValues'

const v1 = { id: 'v1', user_id: 'u1', field_id: 'f1', date: '2026-07-06', value: 7, created_at: '' }
const v2 = { id: 'v2', user_id: 'u1', field_id: 'f2', date: '2026-07-06', value: 'note', created_at: '' }

const mockEqFetch = vi.fn()
const mockSelect = vi.fn(() => ({ eq: mockEqFetch }))
let upsertResponse: { error: { message: string } | null }
const mockUpsert = vi.fn(() => Promise.resolve(upsertResponse))
let deleteResponse: { error: { message: string } | null }
const mockDeleteEqDate = vi.fn(() => Promise.resolve(deleteResponse))
const mockDeleteIn = vi.fn(() => ({ eq: mockDeleteEqDate }))
const mockDelete = vi.fn(() => ({ in: mockDeleteIn }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: mockSelect, upsert: mockUpsert, delete: mockDelete })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockEqFetch.mockResolvedValue({ data: [v1, v2], error: null })
  upsertResponse = { error: null }
  deleteResponse = { error: null }
})

describe('useFieldValues', () => {
  it('maps fetched rows by field_id', async () => {
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.values).toEqual({ f1: 7, f2: 'note' })
  })

  it('saveAll upserts non-empty values with onConflict field_id,date', async () => {
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.saveAll({ f1: 8, f2: 'note', f3: false })
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        { user_id: 'u1', field_id: 'f1', date: '2026-07-06', value: 8 },
        { user_id: 'u1', field_id: 'f2', date: '2026-07-06', value: 'note' },
        { user_id: 'u1', field_id: 'f3', date: '2026-07-06', value: false },
      ],
      { onConflict: 'field_id,date' }
    )
    expect(mockDelete).not.toHaveBeenCalled()
    expect(result.current.values.f1).toBe(8)
  })

  it('saveAll deletes rows whose stored value was emptied', async () => {
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.saveAll({ f1: 7, f2: '' })
    })
    expect(mockDeleteIn).toHaveBeenCalledWith('field_id', ['f2'])
    expect(result.current.values).toEqual({ f1: 7 })
  })

  it('saveAll skips empty values that were never stored', async () => {
    mockEqFetch.mockResolvedValue({ data: [v1], error: null })
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.saveAll({ f1: 7, f9: '' })
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('saveAll surfaces upsert errors', async () => {
    upsertResponse = { error: { message: 'RLS violation' } }
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let returned: { error: string | null } = { error: null }
    await act(async () => {
      returned = await result.current.saveAll({ f1: 8 })
    })
    expect(returned.error).toBe('RLS violation')
  })
})
