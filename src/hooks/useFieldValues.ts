import { supabase } from '../lib/supabase'
import type { FieldValue, FieldValueData } from '../lib/database.types'
import { isEmptyValue } from '../lib/fields'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useFieldValues(date: string) {
  const { data, loading, error, mutate } = useSupabaseQuery<FieldValue[]>(
    `field_values:${date}`,
    () => supabase.from('field_values').select('*').eq('date', date)
  )

  const values: Record<string, FieldValueData> = {}
  for (const row of data ?? []) values[row.field_id] = row.value

  const saveAll = async (
    next: Record<string, FieldValueData>
  ): Promise<{ error: string | null }> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { error: 'Not authenticated' }
    const userId = auth.user.id

    const rows = Object.entries(next)
      .filter(([, value]) => !isEmptyValue(value))
      .map(([field_id, value]) => ({ user_id: userId, field_id, date, value }))
    const emptied = Object.entries(next)
      .filter(([field_id, value]) => isEmptyValue(value) && field_id in values)
      .map(([field_id]) => field_id)

    if (rows.length > 0) {
      const { error } = await supabase
        .from('field_values')
        .upsert(rows, { onConflict: 'field_id,date' })
      if (error) return { error: error.message }
    }
    if (emptied.length > 0) {
      const { error } = await supabase
        .from('field_values')
        .delete()
        .in('field_id', emptied)
        .eq('date', date)
      if (error) return { error: error.message }
    }

    mutate(prev => {
      const kept = (prev ?? []).filter(
        v => !(v.field_id in next) || (!isEmptyValue(next[v.field_id]) )
      )
      const byId = new Map(kept.map(v => [v.field_id, v]))
      for (const row of rows) {
        const existing = byId.get(row.field_id)
        byId.set(row.field_id, existing
          ? { ...existing, value: row.value }
          : { id: `local:${row.field_id}`, created_at: '', ...row })
      }
      return Array.from(byId.values())
    })
    return { error: null }
  }

  return { values, loading, error, saveAll }
}
