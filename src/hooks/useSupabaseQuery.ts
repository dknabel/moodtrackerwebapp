import { useEffect, useRef, useState } from 'react'

interface QueryResponse<T> {
  data: T | null
  error: { message: string } | null
}

interface QueryResult<T> {
  key: string
  data: T | null
  error: string | null
}

/**
 * Fetch-on-mount state for Supabase queries. Loading is derived from whether
 * the stored result matches the current key, so key changes immediately read
 * as loading and late responses for old keys are never shown.
 */
export function useSupabaseQuery<T>(
  key: string,
  fetcher: () => PromiseLike<QueryResponse<T>>
) {
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const [result, setResult] = useState<QueryResult<T> | null>(null)

  useEffect(() => {
    let stale = false
    fetcherRef.current().then(({ data, error }) => {
      if (stale) return
      setResult({ key, data, error: error?.message ?? null })
    })
    return () => { stale = true }
  }, [key])

  const current = result?.key === key ? result : null

  const mutate = (updater: (prev: T | null) => T | null) => {
    setResult(prev =>
      prev && prev.key === key ? { ...prev, data: updater(prev.data) } : prev
    )
  }

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current == null,
    mutate,
  }
}
