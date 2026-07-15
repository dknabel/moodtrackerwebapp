import { supabase } from '../lib/supabase'
import type { CustomField } from '../lib/database.types'
import { DEFAULT_FIELDS, type FieldData } from '../lib/fields'
import { useSupabaseQuery } from './useSupabaseQuery'

const fetchAll = () =>
  supabase.from('custom_fields').select('*').order('sort_order', { ascending: true })

/** Fetch all fields; a brand-new user gets the six defaults seeded first. */
async function fetchFieldsSeedingDefaults() {
  const first = await fetchAll()
  if (first.error || (first.data && first.data.length > 0)) return first
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return first
  const userId = auth.user.id
  // Insert errors are ignored: the unique index on (user_id, lower(name))
  // means a concurrent tab that already seeded will make this whole insert
  // fail atomically (no partial duplicates), and the refetch below returns
  // whatever won the race.
  await supabase.from('custom_fields').insert(
    DEFAULT_FIELDS.map((d, i) => ({
      ...d, user_id: userId, sort_order: i, active: true, show_in_charts: true,
    }))
  )
  return fetchAll()
}

export function useFields() {
  const { data, loading, error, mutate } = useSupabaseQuery<CustomField[]>(
    'custom_fields:all',
    fetchFieldsSeedingDefaults
  )

  const fields = data ?? []

  const addField = async (fieldData: FieldData): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const nextOrder = fields.length === 0 ? 0 : Math.max(...fields.map(f => f.sort_order)) + 1
    const { data: inserted, error } = await supabase
      .from('custom_fields')
      .insert({ ...fieldData, user_id: auth.user.id, sort_order: nextOrder, active: true, show_in_charts: true })
      .select()
      .single()
    if (error) return error.message
    if (inserted) mutate(f => [...(f ?? []), inserted])
    return null
  }

  const updateField = async (
    id: string,
    fieldData: FieldData & { show_in_charts?: boolean }
  ): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('custom_fields')
      .update(fieldData)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    if (updated) mutate(f => (f ?? []).map(fl => (fl.id === id ? updated : fl)))
    return null
  }

  const setActive = async (id: string, active: boolean): Promise<string | null> => {
    const { error } = await supabase.from('custom_fields').update({ active }).eq('id', id)
    if (error) return error.message
    mutate(f => (f ?? []).map(fl => (fl.id === id ? { ...fl, active } : fl)))
    return null
  }

  const archiveField = (id: string) => setActive(id, false)
  const reactivateField = (id: string) => setActive(id, true)

  const deleteField = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('custom_fields').delete().eq('id', id)
    if (error) return error.message
    mutate(f => (f ?? []).filter(fl => fl.id !== id))
    return null
  }

  const moveField = async (id: string, direction: -1 | 1): Promise<string | null> => {
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(f => f.id === id)
    const neighbor = sorted[idx + direction]
    if (idx === -1 || !neighbor) return null
    const current = sorted[idx]
    const first = await supabase
      .from('custom_fields').update({ sort_order: neighbor.sort_order }).eq('id', current.id)
    if (first.error) return first.error.message
    const second = await supabase
      .from('custom_fields').update({ sort_order: current.sort_order }).eq('id', neighbor.id)
    if (second.error) {
      // Best-effort rollback of the first update; its own error is ignored —
      // a refetch reconciles whatever state the DB ended up in.
      await supabase
        .from('custom_fields').update({ sort_order: current.sort_order }).eq('id', current.id)
      return second.error.message
    }
    mutate(f => (f ?? [])
      .map(fl => fl.id === current.id
        ? { ...fl, sort_order: neighbor.sort_order }
        : fl.id === neighbor.id ? { ...fl, sort_order: current.sort_order } : fl)
      .sort((a, b) => a.sort_order - b.sort_order))
    return null
  }

  return {
    fields,
    activeFields: fields.filter(f => f.active),
    loading,
    error,
    addField,
    updateField,
    archiveField,
    reactivateField,
    deleteField,
    moveField,
  }
}
