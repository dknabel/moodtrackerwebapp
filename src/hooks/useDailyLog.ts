import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogUpdate } from '../lib/database.types'

export function useDailyLog(date: string) {
  const [log, setLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .from('daily_logs')
      .select('*')
      .eq('date', date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setLog(data)
        setLoading(false)
      })
  }, [date])

  const save = async (values: DailyLogUpdate) => {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    if (log) {
      const { data: updated, error } = await supabase
        .from('daily_logs')
        .update(values)
        .eq('id', log.id)
        .select()
        .single()
      if (error) return { error: error.message }
      setLog(updated)
      return { error: null }
    } else {
      const insertRecord = { ...values, user_id: user.id, date }
      const { data: inserted, error } = await supabase
        .from('daily_logs')
        .insert(insertRecord)
        .select()
        .single()
      if (error) return { error: error.message }
      setLog(inserted)
      return { error: null }
    }
  }

  return { log, loading, error, save }
}
