# Gratitude Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-day gratitude text note that users write on the Today page and see previewed on History cards.

**Architecture:** Add a `gratitude text` column to the existing `daily_logs` Supabase table. A new `GratitudeSection` component slots into `TodayPage` using the same prop pattern as `MoodSection`/`ExerciseSection`. `HistoryEntry` renders a truncated preview when a note exists.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, Supabase JS v2, Vitest + Testing Library

## Global Constraints

- All components live under `src/components/`
- Tests use Vitest + `@testing-library/react` + `@testing-library/user-event`
- Run tests with: `npm run test`
- Tailwind utility classes only — no inline styles, no CSS modules
- Empty gratitude strings are stored as `null` in the database (never store `""`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/database.types.ts` | Add `gratitude: string \| null` to `DailyLog` |
| Create | `src/components/today/GratitudeSection.tsx` | Textarea UI component |
| Create | `src/components/today/GratitudeSection.test.tsx` | Component tests |
| Modify | `src/components/today/TodayPage.tsx` | Wire gratitude into form state and render section |
| Modify | `src/components/history/HistoryEntry.tsx` | Render truncated preview |

---

### Task 1: Database migration and type update

**Files:**
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Produces: `DailyLog.gratitude: string | null` used by all subsequent tasks

- [ ] **Step 1: Run the migration in Supabase**

Open the Supabase dashboard → SQL Editor → New query. Run:

```sql
ALTER TABLE daily_logs ADD COLUMN gratitude text;
```

Click Run. Expected: "Success. No rows returned."

- [ ] **Step 2: Update the TypeScript type**

In `src/lib/database.types.ts`, add `gratitude` after `wake_time`:

```ts
export interface DailyLog {
  id: string
  user_id: string
  date: string
  mood_rating: number | null
  mood_energy: number | null
  mood_anxiety: number | null
  meals_count: number | null
  exercised: boolean | null
  sleep_hours: number | null
  sleep_quality: number | null
  bedtime: string | null
  wake_time: string | null
  gratitude: string | null
  created_at: string
  updated_at: string
}

export type DailyLogInsert = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>
export type DailyLogUpdate = Partial<Omit<DailyLogInsert, 'user_id' | 'date'>>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/database.types.ts
git commit -m "feat: add gratitude column to DailyLog type"
```

---

### Task 2: GratitudeSection component

**Files:**
- Create: `src/components/today/GratitudeSection.tsx`
- Create: `src/components/today/GratitudeSection.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (standalone component)
- Produces: `GratitudeSection({ value: string, onChange: (value: string) => void })` — used by Task 3

- [ ] **Step 1: Write the failing tests**

Create `src/components/today/GratitudeSection.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GratitudeSection } from './GratitudeSection'

describe('GratitudeSection', () => {
  it('renders the section heading', () => {
    render(<GratitudeSection value="" onChange={vi.fn()} />)
    expect(screen.getByText('Gratitude')).toBeInTheDocument()
  })

  it('renders the textarea with placeholder', () => {
    render(<GratitudeSection value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('What are you grateful for today?')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<GratitudeSection value="Sunny weather" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Sunny weather')).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    render(<GratitudeSection value="" onChange={onChange} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'A')
    expect(onChange).toHaveBeenCalledWith('A')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- GratitudeSection
```

Expected: FAIL — "Cannot find module './GratitudeSection'"

- [ ] **Step 3: Implement the component**

Create `src/components/today/GratitudeSection.tsx`:

```tsx
interface GratitudeSectionProps {
  value: string
  onChange: (value: string) => void
}

export function GratitudeSection({ value, onChange }: GratitudeSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">Gratitude</h2>
      <textarea
        rows={4}
        placeholder="What are you grateful for today?"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- GratitudeSection
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/today/GratitudeSection.tsx src/components/today/GratitudeSection.test.tsx
git commit -m "feat: add GratitudeSection component"
```

---

### Task 3: Wire GratitudeSection into TodayPage

**Files:**
- Modify: `src/components/today/TodayPage.tsx`

**Interfaces:**
- Consumes: `GratitudeSection({ value: string, onChange: (value: string) => void })` from Task 2
- Consumes: `DailyLog.gratitude: string | null` from Task 1

- [ ] **Step 1: Update TodayPage**

Replace the full contents of `src/components/today/TodayPage.tsx` with:

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

      <hr className="border-gray-200" />

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

- [ ] **Step 2: Verify TypeScript and tests pass**

```bash
npm run build && npm run test
```

Expected: build succeeds, all tests pass (no existing tests cover TodayPage internals directly).

- [ ] **Step 3: Commit**

```bash
git add src/components/today/TodayPage.tsx
git commit -m "feat: wire GratitudeSection into TodayPage"
```

---

### Task 4: Gratitude preview in HistoryEntry

**Files:**
- Modify: `src/components/history/HistoryEntry.tsx`

**Interfaces:**
- Consumes: `DailyLog.gratitude: string | null` from Task 1

- [ ] **Step 1: Write the failing tests**

Create `src/components/history/HistoryEntry.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HistoryEntry } from './HistoryEntry'
import type { DailyLog } from '../../lib/database.types'

const baseLog: DailyLog = {
  id: '1',
  user_id: 'u1',
  date: '2026-06-21',
  mood_rating: 7,
  mood_energy: 6,
  mood_anxiety: 4,
  meals_count: 3,
  exercised: true,
  sleep_hours: 7.5,
  sleep_quality: 4,
  bedtime: null,
  wake_time: null,
  gratitude: null,
  created_at: '',
  updated_at: '',
}

function renderEntry(log: DailyLog) {
  return render(
    <MemoryRouter>
      <HistoryEntry log={log} />
    </MemoryRouter>
  )
}

describe('HistoryEntry', () => {
  it('shows no gratitude preview when null', () => {
    renderEntry(baseLog)
    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
  })

  it('shows the full note when 80 chars or fewer', () => {
    renderEntry({ ...baseLog, gratitude: 'Sunny weather' })
    expect(screen.getByText('"Sunny weather"')).toBeInTheDocument()
  })

  it('truncates notes longer than 80 chars', () => {
    const long = 'A'.repeat(90)
    renderEntry({ ...baseLog, gratitude: long })
    expect(screen.getByText(`"${'A'.repeat(80)}…"`)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- HistoryEntry
```

Expected: FAIL — "Unable to find an accessible element with the role 'blockquote'" (or similar, depending on what exists)

- [ ] **Step 3: Update HistoryEntry**

Replace the full contents of `src/components/history/HistoryEntry.tsx` with:

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
      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1"
    >
      <span className="text-sm font-semibold text-gray-900">{log.date}</span>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
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
        <p role="blockquote" className="text-xs text-gray-500 italic mt-1">
          "{truncate(log.gratitude, 80)}"
        </p>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- HistoryEntry
```

Expected: 3 tests pass.

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/history/HistoryEntry.tsx
git commit -m "feat: show gratitude preview in HistoryEntry"
```
