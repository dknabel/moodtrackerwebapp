import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSupabaseQuery } from './useSupabaseQuery'

interface Response {
  data: string[] | null
  error: { message: string } | null
}

describe('useSupabaseQuery', () => {
  it('starts loading, then returns fetched data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: ['a'], error: null })
    const { result } = renderHook(() => useSupabaseQuery<string[]>('k1', fetcher))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual(['a'])
    expect(result.current.error).toBeNull()
  })

  it('surfaces fetch errors', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { result } = renderHook(() => useSupabaseQuery<string[]>('k1', fetcher))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('boom')
    expect(result.current.data).toBeNull()
  })

  it('refetches and reports loading when the key changes', async () => {
    const responses: Record<string, Response> = {
      k1: { data: ['one'], error: null },
      k2: { data: ['two'], error: null },
    }
    const { result, rerender } = renderHook(
      ({ k }) => useSupabaseQuery<string[]>(k, () => Promise.resolve(responses[k])),
      { initialProps: { k: 'k1' } }
    )
    await waitFor(() => expect(result.current.data).toEqual(['one']))

    rerender({ k: 'k2' })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data).toEqual(['two']))
  })

  it('ignores a stale response that resolves after the key changed', async () => {
    let resolveK1!: (r: Response) => void
    const pending = new Promise<Response>(r => { resolveK1 = r })
    const fetchers: Record<string, () => Promise<Response>> = {
      k1: () => pending,
      k2: () => Promise.resolve({ data: ['fresh'], error: null }),
    }
    const { result, rerender } = renderHook(
      ({ k }) => useSupabaseQuery<string[]>(k, fetchers[k]),
      { initialProps: { k: 'k1' } }
    )
    rerender({ k: 'k2' })
    await waitFor(() => expect(result.current.data).toEqual(['fresh']))

    await act(async () => { resolveK1({ data: ['stale'], error: null }) })
    expect(result.current.data).toEqual(['fresh'])
  })

  it('mutate updates the loaded data locally', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: ['a'], error: null })
    const { result } = renderHook(() => useSupabaseQuery<string[]>('k1', fetcher))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.mutate(prev => [...(prev ?? []), 'b']))
    expect(result.current.data).toEqual(['a', 'b'])
  })
})
