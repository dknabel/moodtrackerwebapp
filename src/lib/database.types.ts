export interface DailyLog {
  id: string
  user_id: string
  date: string           // 'YYYY-MM-DD'
  mood_rating: number | null
  mood_energy: number | null
  mood_anxiety: number | null
  meals_count: number | null
  exercised: boolean | null
  sleep_hours: number | null
  sleep_quality: number | null
  bedtime: string | null  // 'HH:MM'
  wake_time: string | null
  created_at: string
  updated_at: string
}

export type DailyLogInsert = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>
export type DailyLogUpdate = Partial<Omit<DailyLogInsert, 'user_id' | 'date'>>
