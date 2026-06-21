import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyLog } from '../lib/database.types'

export function useLogs(fromDate: string, toDate: string) {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .from('daily_logs')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setLogs(data ?? [])
        setLoading(false)
      })
  }, [fromDate, toDate])

  return { logs, loading, error }
}
