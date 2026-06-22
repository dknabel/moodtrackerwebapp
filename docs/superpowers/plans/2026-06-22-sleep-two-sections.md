# Sleep Two Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the time-of-day-based sleep UI with two explicit sub-sections — "Last night's sleep" (wake time, bedtime, hours, quality) and "Tonight" (bedtime only) — backed by a new `tonight_bedtime` column and auto-populated from yesterday's log.

**Architecture:** Add `tonight_bedtime` to `DailyLog`; restructure `SleepSection` into two always-visible sub-sections with no time-of-day logic; update `TodayPage` to fetch yesterday's log and pre-fill `bedtime` from `yesterdayLog.tonight_bedtime` when today's log has none.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Supabase (Postgres), Vitest + Testing Library, date-fns

## Global Constraints

- All new fields optional (`string | null`) — no breaking changes to existing logs
- `tonight_bedtime` label in the UI is "Tonight's bedtime" (distinct from "Bedtime" in Last night section) to keep `getByLabelText` unambiguous in tests
- Wake time renders before bedtime within the "Last night's sleep" sub-section
- No time-of-day logic anywhere in the codebase after this plan

---

### Task 1: Restructure SleepSection with two sub-sections

**Files:**
- Modify: `src/lib/database.types.ts`
- Modify: `src/components/today/SleepSection.tsx`
- Modify: `src/components/today/SleepSection.test.tsx`

**Interfaces:**
- Produces: `SleepValues` extended with `tonight_bedtime: string`; `SleepSection` component with same shape

- [ ] **Step 1: Add `tonight_bedtime` to `database.types.ts`**

Replace `src/lib/database.types.ts` with:

```ts
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
```

- [ ] **Step 2: Write failing tests in `SleepSection.test.tsx`**

Replace `src/components/today/SleepSection.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SleepSection } from './SleepSection'

const defaults = {
  bedtime: '',
  wake_time: '',
  sleep_hours: null as number | null,
  sleep_quality: 3,
  tonight_bedtime: '',
}

describe('SleepSection', () => {
  it('renders "Last night\'s sleep" and "Tonight" sub-section headings', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByText("Last night's sleep")).toBeInTheDocument()
    expect(screen.getByText('Tonight')).toBeInTheDocument()
  })

  it('renders wake time before bedtime in the Last night sub-section', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    const wakeTime = screen.getByLabelText('Wake time')
    const bedtime = screen.getByLabelText('Bedtime')
    expect(wakeTime.compareDocumentPosition(bedtime) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders a "Tonight\'s bedtime" field', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByLabelText("Tonight's bedtime")).toBeInTheDocument()
  })

  it('auto-calculates sleep hours when bedtime and wake time are set', async () => {
    const onChange = vi.fn()
    render(<SleepSection values={defaults} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Bedtime'), '22:00')
    await userEvent.type(screen.getByLabelText('Wake time'), '06:00')
    await waitFor(() => {
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(last.sleep_hours).toBe(8)
    })
  })

  it('propagates tonight_bedtime through onChange without affecting sleep_hours', async () => {
    const onChange = vi.fn()
    render(<SleepSection values={defaults} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText("Tonight's bedtime"), '23:00')
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(last.tonight_bedtime).toBe('23:00')
    expect(last.sleep_hours).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/components/today/SleepSection.test.tsx
```

Expected: multiple failures (sub-section headings not found, `tonight_bedtime` not in `SleepValues`, etc.)

- [ ] **Step 4: Rewrite `SleepSection.tsx`**

Replace `src/components/today/SleepSection.tsx` with:

```tsx
import { useRef, useEffect } from 'react'
import { Slider } from '../ui/Slider'
import { calculateSleepHours } from '../../lib/sleep'

interface SleepValues {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
  tonight_bedtime: string
}

interface SleepSectionProps {
  values: SleepValues
  onChange: (values: SleepValues) => void
}

export function SleepSection({ values, onChange }: SleepSectionProps) {
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sleep</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Last night's sleep</h3>
        <div className="flex gap-4">
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

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tonight</h3>
        <div className="flex flex-col gap-1">
          <label htmlFor="tonight_bedtime" className="text-sm text-gray-600 dark:text-gray-400">Tonight's bedtime</label>
          <input
            id="tonight_bedtime"
            type="time"
            value={values.tonight_bedtime}
            onChange={e => onChange({ ...values, tonight_bedtime: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/components/today/SleepSection.test.tsx
```

Expected: all 5 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/database.types.ts src/components/today/SleepSection.tsx src/components/today/SleepSection.test.tsx
git commit -m "feat: restructure SleepSection into Last night and Tonight sub-sections"
```

---

### Task 2: Update TodayPage with `tonight_bedtime` and auto-populate

**Files:**
- Modify: `src/components/today/TodayPage.tsx`
- Create: `src/components/today/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `SleepValues` with `tonight_bedtime: string` from Task 1
- Consumes: `useDailyLog(date)` — `{ log: DailyLog | null, loading: boolean, error: string | null, save: fn }`

- [ ] **Step 1: Write failing tests in a new `TodayPage.test.tsx`**

Create `src/components/today/TodayPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TodayPage } from './TodayPage'
import * as useDailyLogModule from '../../hooks/useDailyLog'

vi.mock('../../hooks/useDailyLog')

const mockSave = vi.fn().mockResolvedValue({ error: null })

function emptyLog(date: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'x', user_id: 'u1', date,
    mood_rating: null, mood_energy: null, mood_anxiety: null,
    meals_count: null, exercised: null,
    sleep_hours: null, sleep_quality: null,
    bedtime: null, wake_time: null, tonight_bedtime: null,
    gratitude: null, created_at: '', updated_at: '',
    ...overrides,
  }
}

function renderPage(date = '2026-06-22') {
  render(
    <MemoryRouter initialEntries={[`/log/${date}`]}>
      <Routes>
        <Route path="/log/:date" element={<TodayPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TodayPage auto-populate bedtime', () => {
  beforeEach(() => {
    vi.mocked(useDailyLogModule.useDailyLog).mockImplementation((date: string) => {
      if (date === '2026-06-22') {
        return { log: null, loading: false, error: null, save: mockSave }
      }
      if (date === '2026-06-21') {
        return {
          log: emptyLog('2026-06-21', { tonight_bedtime: '23:00:00' }),
          loading: false, error: null, save: vi.fn(),
        }
      }
      return { log: null, loading: false, error: null, save: vi.fn() }
    })
  })

  it('pre-fills last-night bedtime from yesterday tonight_bedtime when today log has no bedtime', async () => {
    renderPage('2026-06-22')
    await waitFor(() => {
      expect(screen.getByLabelText('Bedtime')).toHaveValue('23:00')
    })
  })

  it('does not overwrite bedtime when today log already has one', async () => {
    vi.mocked(useDailyLogModule.useDailyLog).mockImplementation((date: string) => {
      if (date === '2026-06-22') {
        return {
          log: emptyLog('2026-06-22', { bedtime: '22:30:00' }),
          loading: false, error: null, save: mockSave,
        }
      }
      if (date === '2026-06-21') {
        return {
          log: emptyLog('2026-06-21', { tonight_bedtime: '23:00:00' }),
          loading: false, error: null, save: vi.fn(),
        }
      }
      return { log: null, loading: false, error: null, save: vi.fn() }
    })
    renderPage('2026-06-22')
    await waitFor(() => {
      expect(screen.getByLabelText('Bedtime')).toHaveValue('22:30')
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/today/TodayPage.test.tsx
```

Expected: failures — `tonight_bedtime` not in `FormState`, no yesterday log fetch, auto-populate not implemented

- [ ] **Step 3: Update `TodayPage.tsx`**

Replace `src/components/today/TodayPage.tsx` with:

```tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format, subDays, parseISO } from 'date-fns'
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

export function TodayPage() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const date = dateParam ?? todayStr()
  const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')

  const { log, loading, save } = useDailyLog(date)
  const { log: yesterdayLog, loading: yesterdayLoading } = useDailyLog(yesterday)

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (loading || yesterdayLoading) return
    const autoBedtime = yesterdayLog?.tonight_bedtime?.slice(0, 5) ?? ''
    if (log) {
      setForm({
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
      })
    } else {
      setForm({ ...DEFAULT_FORM, bedtime: autoBedtime })
    }
  }, [log, loading, yesterdayLog, yesterdayLoading])

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

  if (loading || yesterdayLoading) {
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

- [ ] **Step 4: Run all tests to confirm they pass**

```bash
npx vitest run
```

Expected: all tests pass, including the two new `TodayPage` tests and all existing tests

- [ ] **Step 5: Commit**

```bash
git add src/components/today/TodayPage.tsx src/components/today/TodayPage.test.tsx
git commit -m "feat: add tonight_bedtime to TodayPage and auto-populate bedtime from yesterday"
```

---

### Task 3: Database migration

**Files:**
- No source files — SQL run in Supabase

- [ ] **Step 1: Run migration in Supabase SQL editor**

Open the Supabase project dashboard → SQL Editor → New query. Run:

```sql
ALTER TABLE daily_logs ADD COLUMN tonight_bedtime time;
```

Expected: success, no rows affected

- [ ] **Step 2: Verify column exists**

In Supabase SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'daily_logs' AND column_name = 'tonight_bedtime';
```

Expected: one row — `tonight_bedtime | time without time zone`

- [ ] **Step 3: Commit migration note**

```bash
git commit --allow-empty -m "chore: add tonight_bedtime time column to daily_logs in Supabase"
```
