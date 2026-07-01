import { supabase } from '../lib/supabase'
import type { MedicationLog } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useMedicationLogs(date: string) {
  const { data, loading, error, mutate } = useSupabaseQuery<MedicationLog[]>(
    `medication_logs:${date}`,
    () => supabase.from('medication_logs').select('*').eq('date', date)
  )

  const setTaken = async (
    medicationId: string,
    taken: boolean,
    takenAt: string | null
  ): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const { data: upserted, error } = await supabase
      .from('medication_logs')
      .upsert(
        { user_id: auth.user.id, date, medication_id: medicationId, taken, taken_at: takenAt },
        { onConflict: 'user_id,date,medication_id' }
      )
      .select()
      .single()
    if (error) return error.message
    if (upserted) {
      mutate(prev => {
        const logs = prev ?? []
        const idx = logs.findIndex(l => l.medication_id === medicationId)
        if (idx >= 0) return logs.map((l, i) => (i === idx ? upserted : l))
        return [...logs, upserted]
      })
    }
    return null
  }

  return { logs: data ?? [], loading, error, setTaken }
}
