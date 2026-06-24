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
  bedtime: string | null        // 'HH:MM:SS' — last night's bedtime
  wake_time: string | null      // 'HH:MM:SS' — this morning's wake time
  tonight_bedtime: string | null  // 'HH:MM:SS' — bedtime starting tonight
  gratitude: string | null
  created_at: string
  updated_at: string
}

export type DailyLogInsert = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>
export type DailyLogUpdate = Partial<Omit<DailyLogInsert, 'user_id' | 'date'>>

export interface Medication {
  id: string
  user_id: string
  name: string
  dose: string
  scheduled_time: string | null  // 'HH:MM'
  active: boolean
  created_at: string
}

export interface MedicationLog {
  id: string
  user_id: string
  date: string                   // 'YYYY-MM-DD'
  medication_id: string
  taken: boolean
  taken_at: string | null        // 'HH:MM'
  created_at: string
}

export type MedicationInsert = Omit<Medication, 'id' | 'created_at'>
export type MedicationLogUpsert = Omit<MedicationLog, 'id' | 'created_at'>
