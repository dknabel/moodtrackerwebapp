import { supabase } from '../lib/supabase'
import type { DailyLog } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useLogs(fromDate: string, toDate: string) {
  const { data, loading, error } = useSupabaseQuery<DailyLog[]>(
    `daily_logs:${fromDate}:${toDate}`,
    () =>
      supabase
        .from('daily_logs')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false })
  )

  return { logs: data ?? [], loading, error }
}
