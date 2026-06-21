import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useDailyLog } from '../../hooks/useDailyLog'
import { MoodSection } from './MoodSection'
import { FoodSection } from './FoodSection'
import { ExerciseSection } from './ExerciseSection'
import { SleepSection } from './SleepSection'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
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
}

const toLogData = (f: FormState) => ({
  ...f,
  bedtime: f.bedtime || null,
  wake_time: f.wake_time || null,
})

export function TodayPage() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const date = dateParam ?? todayStr()
  const { log, loading, save } = useDailyLog(date)

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (log) {
      setForm({
        mood_rating: log.mood_rating ?? 5,
        mood_energy: log.mood_energy ?? 5,
        mood_anxiety: log.mood_anxiety ?? 5,
        meals_count: log.meals_count ?? 0,
        exercised: log.exercised ?? false,
        bedtime: log.bedtime?.slice(0, 5) ?? '',
        wake_time: log.wake_time?.slice(0, 5) ?? '',
        sleep_hours: log.sleep_hours,
        sleep_quality: log.sleep_quality ?? 3,
      })
    }
  }, [log])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    const { error } = await save(toLogData(form))
    if (error) {
      setSaveError(error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-center text-gray-400 mt-12">Loading…</div>
  }

  const isToday = date === todayStr()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">
        {isToday ? 'Today' : date}
      </h1>

      <MoodSection
        values={{ mood_rating: form.mood_rating, mood_energy: form.mood_energy, mood_anxiety: form.mood_anxiety }}
        onChange={v => setForm(f => ({ ...f, ...v }))}
      />

      <hr className="border-gray-200" />

      <FoodSection
        value={form.meals_count}
        onChange={v => setForm(f => ({ ...f, meals_count: v }))}
      />

      <hr className="border-gray-200" />

      <ExerciseSection
        value={form.exercised}
        onChange={v => setForm(f => ({ ...f, exercised: v }))}
      />

      <hr className="border-gray-200" />

      <SleepSection
        values={{ bedtime: form.bedtime, wake_time: form.wake_time, sleep_hours: form.sleep_hours, sleep_quality: form.sleep_quality }}
        onChange={v => setForm(f => ({ ...f, ...v }))}
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
