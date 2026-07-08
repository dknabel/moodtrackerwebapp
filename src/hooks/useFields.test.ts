import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFields } from './useFields'
import type { CustomField } from '../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})
const mood = field({})
const energy = field({ id: 'f2', name: 'Energy', sort_order: 1 })

const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect, then: (r: (x: unknown) => void) => r({ error: null }) }))
const mockUpdateSingle = vi.fn()
let updateEqResponse: { data: unknown; error: { message: string } | null }
// Per-call responses for awaited update().eq() calls; falls back to the shared default.
let updateEqQueue: Array<typeof updateEqResponse> = []
const mockUpdateEq = vi.fn(() => ({
  select: vi.fn(() => ({ single: mockUpdateSingle })),
  then: (resolve: (r: typeof updateEqResponse) => void) =>
    resolve(updateEqQueue.shift() ?? updateEqResponse),
}))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
let deleteEqResponse: { error: { message: string } | null }
const mockDeleteEq = vi.fn(() => ({
  then: (resolve: (r: typeof deleteEqResponse) => void) => resolve(deleteEqResponse),
}))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete,
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockOrder.mockResolvedValue({ data: [mood, energy], error: null })
  updateEqResponse = { data: null, error: null }
  updateEqQueue = []
  deleteEqResponse = { error: null }
})

describe('useFields', () => {
  it('fetches fields sorted by sort_order', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fields).toEqual([mood, energy])
  })

  it('activeFields excludes archived fields', async () => {
    const archived = field({ id: 'f3', name: 'Old', active: false, sort_order: 2 })
    mockOrder.mockResolvedValue({ data: [mood, archived], error: null })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeFields).toEqual([mood])
    expect(result.current.fields).toHaveLength(2)
  })

  it('seeds the six defaults when the user has no fields, then refetches', async () => {
    mockOrder
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [mood], error: null })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Mood', type: 'slider', user_id: 'u1', sort_order: 0 }),
        expect.objectContaining({ name: 'Gratitude', type: 'text', sort_order: 5 }),
      ])
    )
    expect(result.current.fields).toEqual([mood])
  })

  it('addField inserts with next sort_order and appends', async () => {
    const stress = field({ id: 'f9', name: 'Stress', sort_order: 2 })
    mockInsertSingle.mockResolvedValue({ data: stress, error: null })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let returned: string | null = 'sentinel'
    await act(async () => {
      returned = await result.current.addField({ name: 'Stress', type: 'slider', config: { min: 1, max: 10 } })
    })
    expect(returned).toBeNull()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Stress', user_id: 'u1', sort_order: 2, active: true, show_in_charts: true })
    )
    expect(result.current.fields).toContainEqual(stress)
  })

  it('archiveField sets active false and keeps the row in fields', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.archiveField('f1') })
    expect(mockUpdate).toHaveBeenCalledWith({ active: false })
    expect(result.current.activeFields).toEqual([energy])
    expect(result.current.fields).toHaveLength(2)
  })

  it('deleteField removes the row from state', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.deleteField('f1') })
    expect(mockDelete).toHaveBeenCalled()
    expect(result.current.fields).toEqual([energy])
  })

  it('moveField swaps sort_order with the neighbor', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.moveField('f2', -1) })
    expect(result.current.fields.map(f => f.id)).toEqual(['f2', 'f1'])
  })

  it('moveField rolls back the first update when the second fails', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    updateEqQueue = [
      { data: null, error: null },                          // f2 -> sort_order 0 succeeds
      { data: null, error: { message: 'swap failed' } },    // f1 -> sort_order 1 fails
      { data: null, error: null },                          // rollback f2 -> sort_order 1
    ]
    let returned: string | null = null
    await act(async () => { returned = await result.current.moveField('f2', -1) })
    expect(returned).toBe('swap failed')
    expect(result.current.fields.map(f => f.id)).toEqual(['f1', 'f2'])
    // Third update call restores the original sort_order of the moved field.
    expect(mockUpdate).toHaveBeenCalledTimes(3)
    expect(mockUpdate).toHaveBeenNthCalledWith(3, { sort_order: 1 })
    expect(mockUpdateEq).toHaveBeenNthCalledWith(3, 'id', 'f2')
  })

  it('updateField surfaces errors and keeps state', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'nope' } })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let returned: string | null = null
    await act(async () => {
      returned = await result.current.updateField('f1', { name: 'X', type: 'slider', config: {} })
    })
    expect(returned).toBe('nope')
    expect(result.current.fields).toEqual([mood, energy])
  })
})
