import { supabase } from '../lib/supabase'
import type { FieldValue } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useFieldValuesBulk(fromDate: string, toDate: string) {
  const { data, loading, error } = useSupabaseQuery<FieldValue[]>(
    `field_values:${fromDate}:${toDate}`,
    () =>
      supabase
        .from('field_values')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
  )

  return { values: data ?? [], loading, error }
}
