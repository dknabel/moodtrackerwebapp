import { supabase } from '../lib/supabase'
import type { MedicationLog } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useMedicationLogsBulk(fromDate: string, toDate: string) {
  const { data, loading, error } = useSupabaseQuery<MedicationLog[]>(
    `medication_logs:${fromDate}:${toDate}`,
    () =>
      supabase
        .from('medication_logs')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
  )

  return { logs: data ?? [], loading, error }
}
