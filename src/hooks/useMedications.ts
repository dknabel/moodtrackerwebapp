import { supabase } from '../lib/supabase'
import type { Medication } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

interface MedData {
  name: string
  dose: string
  scheduled_time: string | null
}

export function useMedications() {
  const { data, loading, error, mutate } = useSupabaseQuery<Medication[]>(
    'medications:active',
    () =>
      supabase
        .from('medications')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true })
  )

  const addMedication = async (medData: MedData): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const { data: inserted, error } = await supabase
      .from('medications')
      .insert({ ...medData, user_id: auth.user.id, active: true })
      .select()
      .single()
    if (error) return error.message
    if (inserted) mutate(m => [...(m ?? []), inserted])
    return null
  }

  const updateMedication = async (id: string, medData: MedData): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('medications')
      .update(medData)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    if (updated) mutate(m => (m ?? []).map(med => med.id === id ? updated : med))
    return null
  }

  const deactivateMedication = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('medications').update({ active: false }).eq('id', id)
    if (error) return error.message
    mutate(m => (m ?? []).filter(med => med.id !== id))
    return null
  }

  return {
    medications: data ?? [],
    loading,
    error,
    addMedication,
    updateMedication,
    deactivateMedication,
  }
}
