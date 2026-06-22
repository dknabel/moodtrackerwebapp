# Dark Mode — Main App Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark mode styling to the Today, History, and Charts pages so the full app is themed when the dark mode toggle is active.

**Architecture:** Pure Tailwind `dark:` class additions for Today and History components (no logic changes); `isDark` prop threading from `ChartsPage` into the 4 chart components to conditionally set Recharts' inline SVG color props (grid stroke, axis tick fill) which cannot be styled via CSS classes.

**Tech Stack:** React 19, Tailwind CSS v4, Recharts 3, TypeScript 6, Vitest.

## Global Constraints

- `dark:` Tailwind prefix is already active via `@custom-variant dark (&:where(.dark, .dark *));` in `src/index.css` — do not add it again.
- The `dark` class is toggled on `document.documentElement` by `useTheme()` from `src/hooks/useTheme.ts`.
- `useTheme()` returns `{ isDark: boolean, toggle: () => void }`.
- Chart dark colors: CartesianGrid stroke `'#374151'` (dark) / `'#f0f0f0'` (light); axis tick fill `'#9ca3af'` (dark) / `'#666'` (light).
- ExerciseChart inactive bar Cell fill: `'#4b5563'` (dark) / `'#e5e7eb'` (light).
- No new files. No new dependencies. No behavioral logic changes.

---

### Task 1: Today page dark styling

**Files:**
- Modify: `src/components/today/TodayPage.tsx`
- Modify: `src/components/ui/Slider.tsx`
- Modify: `src/components/today/FoodSection.tsx`
- Modify: `src/components/today/ExerciseSection.tsx`
- Modify: `src/components/today/SleepSection.tsx`
- Modify: `src/components/today/GratitudeSection.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing (styling only; no interfaces change)

These are additive class changes only. No logic, no new tests to write. Validate with type-check and regression test run.

- [ ] **Step 1: Update `src/components/today/TodayPage.tsx`**

Replace the loading div, h1, and all four `<hr>` elements with dark variants:

```tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useDailyLog } from '../../hooks/useDailyLog'
import { MoodSection } from './MoodSection'
import { FoodSection } from './FoodSection'
import { ExerciseSection } from './ExerciseSection'
import { SleepSection } from './SleepSection'
import { GratitudeSection } from './GratitudeSection'

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
  gratitude: '',
}

const toLogData = (f: FormState) => ({
  ...f,
  bedtime: f.bedtime || null,
  wake_time: f.wake_time || null,
  gratitude: f.gratitude || null,
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
        gratitude: log.gratitude ?? '',
      })
    } else {
      setForm(DEFAULT_FORM)
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
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
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

      <ExerciseSection
        value={form.exercised}
        onChange={v => setForm(f => ({ ...f, exercised: v }))}
      />

      <hr className="border-gray-200 dark:border-gray-700" />

      <SleepSection
        values={{ bedtime: form.bedtime, wake_time: form.wake_time, sleep_hours: form.sleep_hours, sleep_quality: form.sleep_quality }}
        onChange={v => setForm(f => ({ ...f, ...v }))}
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
```

- [ ] **Step 2: Update `src/components/ui/Slider.tsx`**

```tsx
interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export function Slider({ label, value, min = 1, max = 10, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-blue-600">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onKeyDown={e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(Math.min(max, value + 1))
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(Math.max(min, value - 1))
          }
        }}
        className="w-full accent-blue-600 h-2 cursor-pointer"
      />
    </div>
  )
}
```

- [ ] **Step 3: Update `src/components/today/FoodSection.tsx`**

```tsx
interface FoodSectionProps {
  value: number
  onChange: (value: number) => void
}

export function FoodSection({ value, onChange }: FoodSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Food</h2>
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-600 dark:text-gray-400">Meals today</span>
        <div className="flex items-center gap-4 ml-auto">
          <button
            type="button"
            onClick={() => value > 0 && onChange(value - 1)}
            aria-label="−"
            className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40"
            disabled={value === 0}
          >
            −
          </button>
          <span className="text-xl font-semibold w-6 text-center">{value}</span>
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            aria-label="+"
            className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `src/components/today/ExerciseSection.tsx`**

```tsx
interface ExerciseSectionProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function ExerciseSection({ value, onChange }: ExerciseSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Exercise</h2>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
          className="w-5 h-5 accent-blue-600 cursor-pointer"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Exercised today</span>
      </label>
    </div>
  )
}
```

- [ ] **Step 5: Update `src/components/today/SleepSection.tsx`**

```tsx
import { useRef, useEffect } from 'react'
import { Slider } from '../ui/Slider'
import { calculateSleepHours } from '../../lib/sleep'

interface SleepValues {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
}

interface SleepSectionProps {
  values: SleepValues
  onChange: (values: SleepValues) => void
}

function getTimeOfDay(): 'morning' | 'evening' | 'day' {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 20 || h < 5) return 'evening'
  return 'day'
}

export function SleepSection({ values, onChange }: SleepSectionProps) {
  const timeOfDay = getTimeOfDay()

  // Track latest typed values in refs so handlers can cross-reference
  // even when the parent hasn't flushed the prop update yet (e.g. rapid typing).
  // Also sync refs when props change externally (e.g. log loaded from Supabase).
  const bedtimeRef = useRef(values.bedtime)
  const wakeTimeRef = useRef(values.wake_time)

  useEffect(() => { bedtimeRef.current = values.bedtime }, [values.bedtime])
  useEffect(() => { wakeTimeRef.current = values.wake_time }, [values.wake_time])

  const handleBedtime = (bedtime: string) => {
    bedtimeRef.current = bedtime
    const hours = bedtime && wakeTimeRef.current
      ? calculateSleepHours(bedtime, wakeTimeRef.current)
      : null
    onChange({ ...values, bedtime, sleep_hours: hours })
  }

  const handleWakeTime = (wake_time: string) => {
    wakeTimeRef.current = wake_time
    const hours = bedtimeRef.current && wake_time
      ? calculateSleepHours(bedtimeRef.current, wake_time)
      : null
    onChange({ ...values, wake_time, sleep_hours: hours })
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    onChange({ ...values, sleep_hours: isNaN(v) ? null : v })
  }

  const inputClass = "border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg p-2 text-base"

  const bedtimeField = (
    <div className="flex flex-col gap-1 flex-1">
      <label htmlFor="bedtime" className="text-sm text-gray-600 dark:text-gray-400">Bedtime</label>
      <input
        id="bedtime"
        type="time"
        value={values.bedtime}
        onChange={e => handleBedtime(e.target.value)}
        className={inputClass}
      />
    </div>
  )

  const wakeTimeField = (
    <div className="flex flex-col gap-1 flex-1">
      <label htmlFor="wake_time" className="text-sm text-gray-600 dark:text-gray-400">Wake time</label>
      <input
        id="wake_time"
        type="time"
        value={values.wake_time}
        onChange={e => handleWakeTime(e.target.value)}
        className={inputClass}
      />
    </div>
  )

  const contextLabel =
    timeOfDay === 'morning' ? 'Good morning — how did you sleep?' :
    timeOfDay === 'evening' ? 'Heading to bed?' :
    null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sleep</h2>
        {contextLabel && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contextLabel}</p>}
      </div>
      <div className="flex gap-4">
        {timeOfDay === 'morning' ? <>{wakeTimeField}{bedtimeField}</> : <>{bedtimeField}{wakeTimeField}</>}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sleep_hours" className="text-sm text-gray-600 dark:text-gray-400">
          Hours slept {values.sleep_hours !== null ? `(${values.sleep_hours}h)` : ''}
        </label>
        <input
          id="sleep_hours"
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={values.sleep_hours ?? ''}
          onChange={handleHoursChange}
          placeholder="e.g. 7.5"
          className={`${inputClass} dark:placeholder-gray-400`}
        />
      </div>
      <Slider
        label="Sleep quality"
        value={values.sleep_quality}
        min={1}
        max={5}
        onChange={v => onChange({ ...values, sleep_quality: v })}
      />
    </div>
  )
}
```

- [ ] **Step 6: Update `src/components/today/GratitudeSection.tsx`**

```tsx
interface GratitudeSectionProps {
  value: string
  onChange: (value: string) => void
}

export function GratitudeSection({ value, onChange }: GratitudeSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="gratitude" className="text-base font-semibold text-gray-900 dark:text-white">Gratitude</label>
      <textarea
        id="gratitude"
        rows={4}
        placeholder="What are you grateful for today?"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
```

- [ ] **Step 7: Type-check**

```bash
npm run build 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 8: Run tests**

```bash
npm test
```

Expected: 63/63 passing (no regressions — these are class-only changes).

- [ ] **Step 9: Commit**

```bash
git add src/components/today/TodayPage.tsx src/components/ui/Slider.tsx src/components/today/FoodSection.tsx src/components/today/ExerciseSection.tsx src/components/today/SleepSection.tsx src/components/today/GratitudeSection.tsx
git commit -m "feat: apply dark mode styling to Today page components"
```

---

### Task 2: History page dark styling

**Files:**
- Modify: `src/components/history/HistoryPage.tsx`
- Modify: `src/components/history/HistoryEntry.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing (styling only)

- [ ] **Step 1: Update `src/components/history/HistoryPage.tsx`**

```tsx
import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { HistoryEntry } from './HistoryEntry'

export function HistoryPage() {
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'), [])
  const { logs, loading, error } = useLogs(fromDate, toDate)

  if (loading) {
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
  }

  if (error) {
    return <div className="text-center text-red-500 mt-12">{error}</div>
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 mt-12">
        <p>No entries yet.</p>
        <p className="text-sm mt-1">Log your first day on the Today tab.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">History</h1>
      {logs.map(log => (
        <HistoryEntry key={log.id} log={log} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `src/components/history/HistoryEntry.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import type { DailyLog } from '../../lib/database.types'

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

interface HistoryEntryProps {
  log: DailyLog
}

export function HistoryEntry({ log }: HistoryEntryProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/log/${log.date}`)}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-1"
    >
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{log.date}</span>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {log.mood_rating !== null && <span>Mood {log.mood_rating}/10</span>}
        {log.mood_energy !== null && <span>Energy {log.mood_energy}/10</span>}
        {log.mood_anxiety !== null && <span>Anxiety {log.mood_anxiety}/10</span>}
        {log.sleep_hours !== null && <span>Sleep {log.sleep_hours}h</span>}
        {log.meals_count !== null && <span>{log.meals_count} meals</span>}
        {log.exercised !== null && (
          <span>{log.exercised ? '✓ Exercised' : '✗ No exercise'}</span>
        )}
      </div>
      {log.gratitude && (
        <blockquote className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
          "{truncate(log.gratitude, 80)}"
        </blockquote>
      )}
    </button>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run build 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: 63/63 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/history/HistoryPage.tsx src/components/history/HistoryEntry.tsx
git commit -m "feat: apply dark mode styling to History page components"
```

---

### Task 3: Charts page dark styling

**Files:**
- Modify: `src/components/charts/ChartsPage.tsx`
- Modify: `src/components/charts/MoodChart.tsx`
- Modify: `src/components/charts/SleepChart.tsx`
- Modify: `src/components/charts/MealsChart.tsx`
- Modify: `src/components/charts/ExerciseChart.tsx`

**Interfaces:**
- Consumes: `useTheme(): { isDark: boolean }` from `src/hooks/useTheme.ts`
- Produces:
  - `MoodChart` props: `{ logs: DailyLog[], isDark?: boolean }`
  - `SleepChart` props: `{ logs: DailyLog[], isDark?: boolean }`
  - `MealsChart` props: `{ logs: DailyLog[], isDark?: boolean }`
  - `ExerciseChart` props: `{ logs: DailyLog[], isDark?: boolean }`

- [ ] **Step 1: Update `src/components/charts/MoodChart.tsx`**

```tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MoodChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function MoodChart({ logs, isDark }: MoodChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Mood: l.mood_rating,
    Energy: l.mood_energy,
    Anxiety: l.mood_anxiety,
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mood / Energy / Anxiety</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Mood" stroke="#2563eb" dot={false} connectNulls />
          <Line type="monotone" dataKey="Energy" stroke="#16a34a" dot={false} connectNulls />
          <Line type="monotone" dataKey="Anxiety" stroke="#dc2626" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Update `src/components/charts/SleepChart.tsx`**

```tsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface SleepChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function SleepChart({ logs, isDark }: SleepChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Hours: l.sleep_hours,
    Quality: l.sleep_quality,
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sleep</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="hours" type="monotone" dataKey="Hours" stroke="#7c3aed" dot={false} connectNulls />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke="#0891b2" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Update `src/components/charts/MealsChart.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MealsChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function MealsChart({ logs, isDark }: MealsChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Meals: l.meals_count,
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Meals per Day</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Bar dataKey="Meals" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Update `src/components/charts/ExerciseChart.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface ExerciseChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function ExerciseChart({ logs, isDark }: ExerciseChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    value: l.exercised ? 1 : 0,
  }))

  const exerciseDays = data.filter(d => d.value === 1).length
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'
  const inactiveBarColor = isDark ? '#4b5563' : '#e5e7eb'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Exercise</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{exerciseDays}/{data.length} days</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip formatter={(v) => [v === 1 ? 'Yes' : 'No', 'Exercised']} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.value ? '#16a34a' : inactiveBarColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Update `src/components/charts/ChartsPage.tsx`**

```tsx
import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { useTheme } from '../../hooks/useTheme'
import { MoodChart } from './MoodChart'
import { SleepChart } from './SleepChart'
import { MealsChart } from './MealsChart'
import { ExerciseChart } from './ExerciseChart'

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function ChartsPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const { fromDate, toDate } = useMemo(() => ({
    toDate: format(new Date(), 'yyyy-MM-dd'),
    fromDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
  }), [rangeDays])
  const { logs, loading } = useLogs(fromDate, toDate)
  const chronologicalLogs = useMemo(() => [...logs].reverse(), [logs])
  const { isDark } = useTheme()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Charts</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-400 dark:text-gray-500 mt-8">Loading…</div>}

      {!loading && logs.length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500 mt-8">
          No entries for this period.
        </div>
      )}

      {!loading && chronologicalLogs.length > 0 && (
        <>
          <MoodChart logs={chronologicalLogs} isDark={isDark} />
          <SleepChart logs={chronologicalLogs} isDark={isDark} />
          <MealsChart logs={chronologicalLogs} isDark={isDark} />
          <ExerciseChart logs={chronologicalLogs} isDark={isDark} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Type-check**

```bash
npm run build 2>&1 | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 7: Run tests**

```bash
npm test
```

Expected: 63/63 passing.

- [ ] **Step 8: Start dev server and verify charts visually**

```bash
npm run dev
```

Navigate to the Charts tab. Toggle dark mode. Confirm:
- Chart card backgrounds switch to dark gray (`#1f2937`)
- Grid lines are visible but not harsh (`#374151`)
- Axis tick labels are readable (`#9ca3af`)
- Line/bar colors remain unchanged
- Exercise chart inactive bars show as gray-600 (not near-invisible)
- Range picker pill and active button style correctly

- [ ] **Step 9: Commit**

```bash
git add src/components/charts/ChartsPage.tsx src/components/charts/MoodChart.tsx src/components/charts/SleepChart.tsx src/components/charts/MealsChart.tsx src/components/charts/ExerciseChart.tsx
git commit -m "feat: apply dark mode styling to Charts page with isDark prop threading"
```
