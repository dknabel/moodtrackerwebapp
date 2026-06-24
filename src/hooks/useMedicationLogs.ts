import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MedicationLog } from '../lib/database.types'

export function useMedicationLogs(date: string) {
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('medication_logs')
      .select('*')
      .eq('date', date)
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  }, [date])

  const setTaken = async (medicationId: string, taken: boolean, takenAt: string | null): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data } = await supabase
      .from('medication_logs')
      .upsert(
        { user_id: auth.user.id, date, medication_id: medicationId, taken, taken_at: takenAt },
        { onConflict: 'user_id,date,medication_id' }
      )
      .select()
      .single()
    if (data) {
      setLogs(prev => {
        const idx = prev.findIndex(l => l.medication_id === medicationId)
        if (idx >= 0) return prev.map((l, i) => (i === idx ? data : l))
        return [...prev, data]
      })
    }
  }

  return { logs, loading, setTaken }
}
