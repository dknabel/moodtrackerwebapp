import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MedicationLog } from '../lib/database.types'

export function useMedicationLogsBulk(fromDate: string, toDate: string) {
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stale = false
    setLoading(true)
    supabase
      .from('medication_logs')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .then(({ data }) => {
        if (stale) return
        setLogs(data ?? [])
        setLoading(false)
      })
    return () => { stale = true }
  }, [fromDate, toDate])

  return { logs, loading }
}
