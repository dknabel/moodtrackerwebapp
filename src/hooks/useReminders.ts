import { supabase } from '../lib/supabase'
import type { Reminder, ReminderKind, ReminderUpdate } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

interface NewReminderData {
  kind: ReminderKind
  medication_id: string | null
  time: string
  label: string | null
}

export function useReminders() {
  const { data, loading, error, mutate } = useSupabaseQuery<Reminder[]>(
    'reminders:all',
    () =>
      supabase
        .from('reminders')
        .select('*')
        .order('created_at', { ascending: true })
  )

  const addReminder = async (reminderData: NewReminderData): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert({ ...reminderData, user_id: auth.user.id, enabled: true })
      .select()
      .single()
    if (error) return error.message
    if (inserted) mutate(r => [...(r ?? []), inserted])
    return null
  }

  const updateReminder = async (id: string, reminderData: ReminderUpdate): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('reminders')
      .update(reminderData)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    if (updated) mutate(r => (r ?? []).map(rem => rem.id === id ? updated : rem))
    return null
  }

  const deleteReminder = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (error) return error.message
    mutate(r => (r ?? []).filter(rem => rem.id !== id))
    return null
  }

  return {
    reminders: data ?? [],
    loading,
    error,
    addReminder,
    updateReminder,
    deleteReminder,
  }
}
