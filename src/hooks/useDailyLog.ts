import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogUpdate } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useDailyLog(date: string) {
  const { data: log, loading, error, mutate } = useSupabaseQuery<DailyLog | null>(
    `daily_log:${date}`,
    () => supabase.from('daily_logs').select('*').eq('date', date).maybeSingle()
  )

  const save = async (values: DailyLogUpdate) => {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const record = { ...values, user_id: user.id, date }
    const { data: saved, error } = await supabase
      .from('daily_logs')
      .upsert(record, { onConflict: 'user_id,date' })
      .select()
      .single()
    if (error) return { error: error.message }
    mutate(() => saved)
    return { error: null }
  }

  return { log: log ?? null, loading, error, save }
}
