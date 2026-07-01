import { useEffect, useRef, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { format, subDays, parseISO, isValid } from 'date-fns'
import { useDailyLog } from '../../hooks/useDailyLog'
import type { DailyLog, DailyLogUpdate } from '../../lib/database.types'
import { MoodSection } from './MoodSection'
import { FoodSection } from './FoodSection'
import { MedsSection } from './MedsSection'
import { SleepSection } from './SleepSection'
import { ExerciseSection } from './ExerciseSection'
import { GratitudeSection } from './GratitudeSection'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function isValidDateParam(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const parsed = parseISO(s)
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === s
}

interface FormState {
  mood_rating: number
  mood_energy: number
  mood_anxiety: number
  meals_count: number
  exercised: boolean
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
  tonight_bedtime: string
  gratitude: string
}

const DEFAULT_FORM: FormState = {
  mood_rating: 5,
  mood_energy: 5,
  mood_anxiety: 5,
  meals_count: 0,
  exercised: false,
  bedtime: '',
  wake_time: '',
  sleep_hours: null,
  sleep_quality: 3,
  tonight_bedtime: '',
  gratitude: '',
}

const toLogData = (f: FormState) => ({
  ...f,
  bedtime: f.bedtime || null,
  wake_time: f.wake_time || null,
  tonight_bedtime: f.tonight_bedtime || null,
  gratitude: f.gratitude || null,
})

function initialForm(log: DailyLog | null, autoBedtime: string): FormState {
  if (!log) return { ...DEFAULT_FORM, bedtime: autoBedtime }
  return {
    mood_rating: log.mood_rating ?? 5,
    mood_energy: log.mood_energy ?? 5,
    mood_anxiety: log.mood_anxiety ?? 5,
    meals_count: log.meals_count ?? 0,
    exercised: log.exercised ?? false,
    bedtime: log.bedtime?.slice(0, 5) || autoBedtime,
    wake_time: log.wake_time?.slice(0, 5) ?? '',
    sleep_hours: log.sleep_hours,
    sleep_quality: log.sleep_quality ?? 3,
    tonight_bedtime: log.tonight_bedtime?.slice(0, 5) ?? '',
    gratitude: log.gratitude ?? '',
  }
}

export function TodayPage() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const paramValid = dateParam == null || isValidDateParam(dateParam)
  const date = dateParam != null && paramValid ? dateParam : todayStr()
  const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')

  const { log, loading, error, save } = useDailyLog(date)
  const { log: yesterdayLog, loading: yesterdayLoading } = useDailyLog(yesterday)

  if (!paramValid) {
    return <Navigate to="/" replace />
  }

  if (loading || yesterdayLoading) {
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
  }

  if (error) {
    return <div className="text-center text-red-500 mt-12">Could not load this entry: {error}</div>
  }

  const autoBedtime = yesterdayLog?.tonight_bedtime?.slice(0, 5) ?? ''

  return (
    <LogForm
      key={date}
      date={date}
      initial={initialForm(log, autoBedtime)}
      save={save}
    />
  )
}

interface LogFormProps {
  date: string
  initial: FormState
  save: (values: DailyLogUpdate) => Promise<{ error: string | null }>
}

function LogForm({ date, initial, save }: LogFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(savedTimeout.current), [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    const { error } = await save(toLogData(form))
    if (error) {
      setSaveError(error)
    } else {
      setSaved(true)
      clearTimeout(savedTimeout.current)
      savedTimeout.current = setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const isToday = date === todayStr()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        {isToday ? 'Today' : date}
      </h1>

      <MoodSection
        values={{ mood_rating: form.mood_rating, mood_energy: form.mood_energy, mood_anxiety: form.mood_anxiety }}
        onChange={v => setForm(f => ({ ...f, ...v }))}
      />

      <hr className="border-gray-200 dark:border-gray-700" />

      <FoodSection
        value={form.meals_count}
        onChange={v => setForm(f => ({ ...f, meals_count: v }))}
      />

      <hr className="border-gray-200 dark:border-gray-700" />

      <MedsSection date={date} />

      <hr className="border-gray-200 dark:border-gray-700" />

      <SleepSection
        values={{
          bedtime: form.bedtime,
          wake_time: form.wake_time,
          sleep_hours: form.sleep_hours,
          sleep_quality: form.sleep_quality,
          tonight_bedtime: form.tonight_bedtime,
        }}
        onChange={v => setForm(f => ({ ...f, ...v }))}
      />

      <hr className="border-gray-200 dark:border-gray-700" />

      <ExerciseSection
        value={form.exercised}
        onChange={v => setForm(f => ({ ...f, exercised: v }))}
      />

      <hr className="border-gray-200 dark:border-gray-700" />

      <GratitudeSection
        value={form.gratitude}
        onChange={v => setForm(f => ({ ...f, gratitude: v }))}
      />

      {saveError && (
        <p className="text-red-600 text-sm">{saveError}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}
