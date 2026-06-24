import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Medication } from '../lib/database.types'

interface MedData {
  name: string
  dose: string
  scheduled_time: string | null
}

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('medications')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMedications(data ?? [])
        setLoading(false)
      })
  }, [])

  const addMedication = async (data: MedData): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data: inserted } = await supabase
      .from('medications')
      .insert({ ...data, user_id: auth.user.id, active: true })
      .select()
      .single()
    if (inserted) setMedications(m => [...m, inserted])
  }

  const updateMedication = async (id: string, data: MedData): Promise<void> => {
    const { data: updated } = await supabase
      .from('medications')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (updated) setMedications(m => m.map(med => med.id === id ? updated : med))
  }

  const deactivateMedication = async (id: string): Promise<void> => {
    await supabase.from('medications').update({ active: false }).eq('id', id)
    setMedications(m => m.filter(med => med.id !== id))
  }

  return { medications, loading, addMedication, updateMedication, deactivateMedication }
}
