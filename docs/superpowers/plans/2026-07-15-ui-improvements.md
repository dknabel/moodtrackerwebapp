# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 13 approved UI improvements: autosave on the Today page, date navigation with friendly formatting, an in-app ConfirmDialog replacing native dialogs, accessible modals, and a set of mechanical polish fixes (touch targets, focus rings, slider labels, stepper dedup, skeletons, dark-mode consistency, iOS safe area).

**Architecture:** Vite + React 19 SPA with React Router v7, Tailwind CSS v4 (dark mode via `@custom-variant dark`), Supabase for data (already abstracted behind hooks — no data-layer changes). New shared units: `src/lib/dates.ts` (formatDay), `src/hooks/useModal.ts` (modal behavior), `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/Skeleton.tsx`, `src/lib/styles.ts` (focus-ring class constant).

**Tech Stack:** React 19, TypeScript, Tailwind v4, date-fns v4, lucide-react, vitest + @testing-library/react (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-15-ui-improvements-design.md`

## Global Constraints

- Run a single test file with: `npx vitest run src/path/to/file.test.tsx`
- Full verification: `npm test`, `npm run lint`, `npm run build`
- Dark mode uses the `dark:` variant (class-based, configured in `src/index.css`); every new visible element needs both light and dark styles.
- Blue interactive text is `text-blue-600 dark:text-blue-400`; error text is `text-red-500 dark:text-red-400` (or `text-red-600 dark:text-red-400`).
- Commit messages use `feat:` / `fix:` / `refactor:` / `test:` prefixes and end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- All app code lives under `src/`; components in `src/components/<area>/`, shared UI in `src/components/ui/`, hooks in `src/hooks/`, pure helpers in `src/lib/`.
- Icons come from `lucide-react` v1 (already a dependency).
- Dates are ISO `yyyy-MM-dd` strings throughout the app; date-fns `parseISO`/`format` for conversion.

---

### Task 1: `formatDay` date helper

**Files:**
- Create: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Consumes: nothing (pure helper).
- Produces: `formatDay(dateStr: string, now?: Date): string` — returns `"Today"`, `"Yesterday"`, `"Tue, Jul 1"` (same year), or `"Tue, Jul 1, 2025"` (other year). Malformed input is returned unchanged. Tasks 2 and 4 import this exact signature.

- [ ] **Step 1: Write the failing test**

Create `src/lib/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatDay } from './dates'

// Fixed "now" so tests are deterministic: Wednesday 2026-07-15.
const now = new Date(2026, 6, 15, 12, 0, 0)

describe('formatDay', () => {
  it('returns Today for the current date', () => {
    expect(formatDay('2026-07-15', now)).toBe('Today')
  })

  it('returns Yesterday for the previous date', () => {
    expect(formatDay('2026-07-14', now)).toBe('Yesterday')
  })

  it('formats other dates in the current year without the year', () => {
    expect(formatDay('2026-07-01', now)).toBe('Wed, Jul 1')
  })

  it('appends the year for dates in a different year', () => {
    expect(formatDay('2025-12-31', now)).toBe('Wed, Dec 31, 2025')
  })

  it('returns malformed input unchanged', () => {
    expect(formatDay('not-a-date', now)).toBe('not-a-date')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: FAIL — cannot resolve `./dates`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/dates.ts`:

```ts
import { format, isValid, parseISO, subDays } from 'date-fns'

/** Formats an ISO yyyy-MM-dd date as "Today", "Yesterday", or a short
 * human date ("Tue, Jul 1", with the year appended when it differs from
 * the current year). Malformed input is returned unchanged. */
export function formatDay(dateStr: string, now: Date = new Date()): string {
  const parsed = parseISO(dateStr)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !isValid(parsed)) return dateStr
  if (dateStr === format(now, 'yyyy-MM-dd')) return 'Today'
  if (dateStr === format(subDays(now, 1), 'yyyy-MM-dd')) return 'Yesterday'
  const sameYear = format(parsed, 'yyyy') === format(now, 'yyyy')
  return format(parsed, sameYear ? 'EEE, MMM d' : 'EEE, MMM d, yyyy')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dates.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat: add formatDay date helper

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Friendly dates in History entries

**Files:**
- Modify: `src/components/history/HistoryEntry.tsx`
- Test: `src/components/history/HistoryEntry.test.tsx` (new)

**Interfaces:**
- Consumes: `formatDay(dateStr)` from `src/lib/dates.ts` (Task 1).
- Produces: no new interfaces; `HistoryEntry` props unchanged.

- [ ] **Step 1: Write the failing test**

Create `src/components/history/HistoryEntry.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { HistoryEntry } from './HistoryEntry'

const renderEntry = (date: string) =>
  render(
    <MemoryRouter>
      <HistoryEntry date={date} sleepHours={7.5} items={[]} />
    </MemoryRouter>
  )

describe('HistoryEntry', () => {
  it('shows Yesterday for the previous day', () => {
    renderEntry(format(subDays(new Date(), 1), 'yyyy-MM-dd'))
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })

  it('shows a short human date instead of the ISO string', () => {
    renderEntry('2026-01-05')
    expect(screen.queryByText('2026-01-05')).not.toBeInTheDocument()
    expect(screen.getByText(/Jan 5/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/history/HistoryEntry.test.tsx`
Expected: FAIL — `Yesterday` not found (raw ISO date rendered).

- [ ] **Step 3: Use formatDay in HistoryEntry**

In `src/components/history/HistoryEntry.tsx`, add the import:

```tsx
import { formatDay } from '../../lib/dates'
```

and change the date span (line 31) from:

```tsx
<span className="text-sm font-semibold text-gray-900 dark:text-white">{date}</span>
```

to:

```tsx
<span className="text-sm font-semibold text-gray-900 dark:text-white">{formatDay(date)}</span>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/history/HistoryEntry.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/history/HistoryEntry.tsx src/components/history/HistoryEntry.test.tsx
git commit -m "feat: human-friendly dates in History entries

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Autosave on the Today page

**Files:**
- Modify: `src/components/today/TodayPage.tsx` (the `LogForm` component, lines 118-222)
- Test: `src/components/today/TodayPage.test.tsx`

**Interfaces:**
- Consumes: existing `save`/`saveValues` props (unchanged signatures returning `Promise<{ error: string | null }>`).
- Produces: `LogForm` no longer renders a Save button. It renders a status region: text `Saving…`, `Saved`, or the error message plus a button named `Retry`. Task 4 modifies the same header row — the right side of the header is `<SaveStatus …/>` followed by the existing `Manage fields` button.

- [ ] **Step 1: Rewrite the save-related tests to expect autosave**

In `src/components/today/TodayPage.test.tsx`:

1. Change the testing-library import (line 2) to:

```tsx
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
```

(`userEvent` is still used by other tests — keep its import.)

2. Add fake-timer setup below `beforeEach(() => vi.clearAllMocks())` (line 33):

```tsx
afterEach(() => vi.useRealTimers())
```

(add `afterEach` to the vitest import on line 1).

3. Replace the two tests `'save writes sleep columns to daily_logs and field values to saveAll'` and `'shows the save error when field values fail to save'` (lines 61-79) with:

```tsx
  it('autosaves sleep columns and field values after edits settle', async () => {
    vi.useFakeTimers()
    renderPage()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } })
    expect(mockSave).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(mockSaveAll).toHaveBeenCalledWith({ f1: 9, f2: false })
    const sleepPayload = mockSave.mock.calls[0][0]
    expect(sleepPayload).toEqual({
      bedtime: null, wake_time: null, sleep_hours: null, sleep_quality: 3, tonight_bedtime: null,
    })
    expect(sleepPayload).not.toHaveProperty('mood_rating')
  })

  it('flushes a pending save on unmount', async () => {
    // Real timers: unmount happens well before the 1s debounce fires, so a
    // save here proves the unmount flush ran.
    const { unmount } = renderPage()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } })
    unmount()
    await waitFor(() => expect(mockSaveAll).toHaveBeenCalledWith({ f1: 9, f2: false }))
  })

  it('does not save when nothing has been edited', async () => {
    vi.useFakeTimers()
    const { unmount } = renderPage()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    unmount()
    await act(async () => { await Promise.resolve() })
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSaveAll).not.toHaveBeenCalled()
  })

  it('shows the save error with a Retry button when saving fails', async () => {
    vi.useFakeTimers()
    mockSaveAll.mockResolvedValueOnce({ error: 'boom' })
    renderPage()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(screen.getByText(/boom/)).toBeInTheDocument()
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByText(/boom/)).not.toBeInTheDocument())
    expect(mockSaveAll).toHaveBeenCalledTimes(2)
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/today/TodayPage.test.tsx`
Expected: the 4 new tests FAIL (no autosave; Save button still present); the other tests PASS.

- [ ] **Step 3: Implement autosave in LogForm**

In `src/components/today/TodayPage.tsx`, replace the entire `LogForm` function (lines 127-222) with:

```tsx
type SaveStatusKind = 'idle' | 'saving' | 'saved' | 'error'

function LogForm({ date, fields, initial, save, saveValues, onManageFields }: LogFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [status, setStatus] = useState<SaveStatusKind>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const formRef = useRef(form)
  formRef.current = form
  const dirtyRef = useRef(false)
  const chainRef = useRef<Promise<void>>(Promise.resolve())
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const savedRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const runSave = () => {
    dirtyRef.current = false
    chainRef.current = chainRef.current.then(async () => {
      setStatus('saving')
      setSaveError(null)
      const snapshot = formRef.current
      const [logRes, valuesRes] = await Promise.all([
        save(toSleepData(snapshot)),
        saveValues(snapshot.fieldValues),
      ])
      const error = logRes.error ?? valuesRes.error
      if (error) {
        setSaveError(error)
        setStatus('error')
      } else {
        setStatus('saved')
        clearTimeout(savedRef.current)
        savedRef.current = setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2000)
      }
    })
  }
  const runSaveRef = useRef(runSave)
  runSaveRef.current = runSave

  const update = (updater: (f: FormState) => FormState) => {
    setForm(updater)
    dirtyRef.current = true
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSaveRef.current(), 1000)
  }

  // Flush any pending save when the form unmounts (navigation, date switch).
  useEffect(
    () => () => {
      clearTimeout(debounceRef.current)
      clearTimeout(savedRef.current)
      if (dirtyRef.current) runSaveRef.current()
    },
    []
  )

  const fieldValue = (f: CustomField) => form.fieldValues[f.id] ?? defaultFieldValue(f)
  const isToday = date === todayStr()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isToday ? 'Today' : date}
        </h1>
        <div className="flex items-center gap-3">
          <SaveStatus status={status} error={saveError} onRetry={runSave} />
          <button
            type="button"
            onClick={onManageFields}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium"
          >
            Manage fields
          </button>
        </div>
      </div>

      <Card>
        <SleepSection
          values={{
            bedtime: form.bedtime,
            wake_time: form.wake_time,
            sleep_hours: form.sleep_hours,
            sleep_quality: form.sleep_quality,
            tonight_bedtime: form.tonight_bedtime,
          }}
          onChange={v => update(f => ({ ...f, ...v }))}
        />
      </Card>

      {fields.map(field => (
        <Card key={field.id}>
          <FieldSection
            field={field}
            value={fieldValue(field)}
            onChange={v =>
              update(f => ({ ...f, fieldValues: { ...f.fieldValues, [field.id]: v } }))
            }
          />
        </Card>
      ))}

      <Card>
        <MedsSection date={date} />
      </Card>
    </div>
  )
}

function SaveStatus({ status, error, onRetry }: {
  status: SaveStatusKind
  error: string | null
  onRetry: () => void
}) {
  if (status === 'saving') {
    return <span className="text-xs text-gray-400 dark:text-gray-500">Saving…</span>
  }
  if (status === 'saved') {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
        <Check className="w-3.5 h-3.5" />
        Saved
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
        <span className="max-w-40 truncate">{error}</span>
        <button type="button" onClick={onRetry} className="underline font-medium shrink-0">
          Retry
        </button>
      </span>
    )
  }
  return null
}
```

Notes for the implementer:
- The `Check` import from `lucide-react` (line 4) is still used — keep it.
- `chainRef` sequences saves so a slow in-flight save can never overwrite a newer one; each queued save reads the latest form from `formRef`.
- React 19 silently ignores `setState` after unmount, so the flush-on-unmount save is safe.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/TodayPage.test.tsx`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/today/TodayPage.tsx src/components/today/TodayPage.test.tsx
git commit -m "feat: autosave Today form, remove manual Save button

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Date navigation on the Today page

**Files:**
- Modify: `src/components/today/TodayPage.tsx` (the `LogForm` header from Task 3)
- Test: `src/components/today/TodayPage.test.tsx`

**Interfaces:**
- Consumes: `formatDay(dateStr)` from Task 1; the header layout produced by Task 3.
- Produces: header controls — buttons named `Previous day`, `Next day` (disabled on today), `Today` (only on past dates), and a date input labeled `Choose date`.

- [ ] **Step 1: Write the failing tests**

In `src/components/today/TodayPage.test.tsx`, update the date-param describe block (lines 82-102). Replace the test `'renders the page for a valid date'` and add navigation tests so the block reads:

```tsx
describe('TodayPage date param validation', () => {
  it('redirects to home instead of crashing on a malformed date', () => {
    renderAt('/log/not-a-date')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('redirects to home on an impossible calendar date', () => {
    renderAt('/log/2026-13-99')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('renders a friendly heading for a valid past date', () => {
    renderAt('/log/2026-06-15')
    expect(screen.getByRole('heading', { name: /Jun 15/ })).toBeInTheDocument()
  })

  it('shows "Today" for the current date', () => {
    renderAt(`/log/${format(new Date(), 'yyyy-MM-dd')}`)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })
})

describe('TodayPage date navigation', () => {
  it('steps back one day with the previous arrow', async () => {
    renderAt('/log/2026-06-15')
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(screen.getByRole('heading', { name: /Jun 14/ })).toBeInTheDocument()
  })

  it('steps forward one day with the next arrow', async () => {
    renderAt('/log/2026-06-15')
    await userEvent.click(screen.getByRole('button', { name: 'Next day' }))
    expect(screen.getByRole('heading', { name: /Jun 16/ })).toBeInTheDocument()
  })

  it('disables the next arrow on today', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
  })

  it('returns to today via the Today link', async () => {
    renderAt('/log/2026-06-15')
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('hides the Today link when already on today', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
  })

  it('jumps to a chosen date with the date picker', async () => {
    renderAt('/log/2026-06-15')
    fireEvent.change(screen.getByLabelText('Choose date'), { target: { value: '2026-06-10' } })
    expect(await screen.findByRole('heading', { name: /Jun 10/ })).toBeInTheDocument()
  })
})
```

Note: `renderPage()` renders at `/` without a `/log/:date` route, so arrow *navigation* tests must use `renderAt`; the disabled/hidden assertions work with `renderPage`.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/today/TodayPage.test.tsx`
Expected: the new navigation tests FAIL (`Previous day` not found); the friendly-heading test FAILS (heading is the raw ISO date).

- [ ] **Step 3: Implement the date-navigation header**

In `src/components/today/TodayPage.tsx`:

1. Update imports:

```tsx
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { format, subDays, addDays, parseISO, isValid } from 'date-fns'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDay } from '../../lib/dates'
```

2. Inside `LogForm`, add below the refs from Task 3:

```tsx
  const navigate = useNavigate()
  const goTo = (d: string) => navigate(d === todayStr() ? '/' : `/log/${d}`)
  const prevDay = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')
  const nextDay = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
```

3. Replace the header block from Task 3 (the `<div className="flex justify-between items-center">…</div>` containing the `<h1>`) with:

```tsx
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => goTo(prevDay)}
            aria-label="Previous day"
            className="p-2 -ml-2 text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {formatDay(date)}
            </h1>
            <input
              type="date"
              aria-label="Choose date"
              value={date}
              max={todayStr()}
              onChange={e => { if (e.target.value) goTo(e.target.value) }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <button
            type="button"
            onClick={() => goTo(nextDay)}
            aria-label="Next day"
            disabled={isToday}
            className="p-2 text-gray-500 dark:text-gray-400 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => goTo(todayStr())}
              className="text-sm text-blue-600 dark:text-blue-400 font-medium"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus status={status} error={saveError} onRetry={runSave} />
          <button
            type="button"
            onClick={onManageFields}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium"
          >
            Manage fields
          </button>
        </div>
      </div>
```

(The `isToday` const from Task 3 is reused; the overlaid transparent date input makes the heading itself tappable to open the native picker.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/TodayPage.test.tsx`
Expected: PASS (all tests). The unmount-flush autosave still passes: navigating remounts `LogForm` (keyed by `date`), which flushes pending saves.

- [ ] **Step 5: Commit**

```bash
git add src/components/today/TodayPage.tsx src/components/today/TodayPage.test.tsx
git commit -m "feat: day-step arrows, date picker, and friendly dates on Today page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `useModal` accessibility hook

**Files:**
- Create: `src/hooks/useModal.ts`
- Test: `src/hooks/useModal.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `useModal(onClose: () => void): RefObject<HTMLDivElement | null>` — attach the returned ref to the dialog element. Provides: focus first focusable on mount, restore focus on unmount, body scroll lock, Tab focus trap, Escape → `onClose`. When modals stack, only the topmost reacts to Escape/Tab. Tasks 6-8 consume this.

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModal } from './useModal'

function TestModal({ onClose, label }: { onClose: () => void; label: string }) {
  const ref = useModal(onClose)
  return (
    <div ref={ref} role="dialog" aria-label={label}>
      <button>{label}-first</button>
      <button>{label}-last</button>
    </div>
  )
}

describe('useModal', () => {
  it('focuses the first focusable element on mount', () => {
    render(<TestModal onClose={() => {}} label="m" />)
    expect(screen.getByRole('button', { name: 'm-first' })).toHaveFocus()
  })

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = render(<TestModal onClose={() => {}} label="m" />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    render(<TestModal onClose={onClose} label="m" />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('only the topmost modal closes on Escape when stacked', async () => {
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    render(
      <>
        <TestModal onClose={closeOuter} label="outer" />
        <TestModal onClose={closeInner} label="inner" />
      </>
    )
    await userEvent.keyboard('{Escape}')
    expect(closeInner).toHaveBeenCalledOnce()
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('wraps Tab focus from last back to first', async () => {
    render(<TestModal onClose={() => {}} label="m" />)
    screen.getByRole('button', { name: 'm-last' }).focus()
    await userEvent.keyboard('{Tab}')
    expect(screen.getByRole('button', { name: 'm-first' })).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useModal.test.tsx`
Expected: FAIL — cannot resolve `./useModal`.

- [ ] **Step 3: Write the implementation**

Create `src/hooks/useModal.ts`:

```ts
import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Stack of open modals so that with nested dialogs (e.g. a confirm on top of
// a sheet) only the topmost one reacts to Escape and traps Tab.
const stack: symbol[] = []

/** Accessible modal behavior: focuses the dialog on open, restores focus on
 * close, locks body scroll, traps Tab, and closes on Escape. Attach the
 * returned ref to the dialog element. */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const id = Symbol('modal')
    stack.push(id)
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || !dialog) return
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      window.removeEventListener('keydown', handleKey)
      stack.splice(stack.indexOf(id), 1)
      if (stack.length === 0) document.body.style.overflow = bodyOverflow
      previous?.focus()
    }
  }, [])

  return ref
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useModal.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModal.ts src/hooks/useModal.test.tsx
git commit -m "feat: useModal hook with focus trap, scroll lock, and Escape handling

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: ConfirmDialog component

**Files:**
- Create: `src/components/ui/ConfirmDialog.tsx`
- Test: `src/components/ui/ConfirmDialog.test.tsx`

**Interfaces:**
- Consumes: `useModal` from Task 5.
- Produces: `<ConfirmDialog title message confirmLabel onConfirm onCancel />` — `role="alertdialog"`, Cancel button focused first, red confirm button labeled `confirmLabel`, overlay click and Escape call `onCancel`. Tasks 7-8 consume this exact prop shape.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/ConfirmDialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

const props = {
  title: 'Archive Mood?',
  message: 'Its history is kept.',
  confirmLabel: 'Archive',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('ConfirmDialog', () => {
  it('renders title and message in an alertdialog', () => {
    render(<ConfirmDialog {...props} />)
    const dialog = screen.getByRole('alertdialog', { name: 'Archive Mood?' })
    expect(dialog).toHaveTextContent('Its history is kept.')
  })

  it('focuses Cancel initially', () => {
    render(<ConfirmDialog {...props} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('calls onConfirm from the confirm button', async () => {
    render(<ConfirmDialog {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(props.onConfirm).toHaveBeenCalledOnce()
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it('cancels on Cancel click and on Escape', async () => {
    render(<ConfirmDialog {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.keyboard('{Escape}')
    expect(props.onCancel).toHaveBeenCalledTimes(2)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/ConfirmDialog.test.tsx`
Expected: FAIL — cannot resolve `./ConfirmDialog`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/ConfirmDialog.tsx`:

```tsx
import { useModal } from '../../hooks/useModal'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useModal(onCancel)
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white rounded-lg p-2 text-sm font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/ConfirmDialog.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ConfirmDialog.tsx src/components/ui/ConfirmDialog.test.tsx
git commit -m "feat: reusable ConfirmDialog component

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: ManageFieldsModal — ConfirmDialog + useModal

**Files:**
- Modify: `src/components/today/ManageFieldsModal.tsx`
- Test: `src/components/today/ManageFieldsModal.test.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` (Task 6), `useModal` (Task 5). Props of `ManageFieldsModal` are unchanged.
- Produces: no native `window.confirm`/`window.prompt` anywhere in the file.

- [ ] **Step 1: Rewrite the confirm-based tests**

In `src/components/today/ManageFieldsModal.test.tsx`:

1. Add `within` to the testing-library import (line 2):

```tsx
import { render, screen, within } from '@testing-library/react'
```

2. Replace the three tests `'warns before an incompatible type change'`, `'archives with confirmation'`, and `'hard delete requires typing DELETE'` (lines 55-80) with:

```tsx
  it('warns before an incompatible type change and cancels cleanly', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const dialog = screen.getByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onUpdate).not.toHaveBeenCalled()
  })

  it('applies an incompatible type change after confirming', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Change type' }))
    expect(handlers.onUpdate).toHaveBeenCalledWith('f1', expect.objectContaining({ type: 'text' }))
  })

  it('archives only after confirming the dialog', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(handlers.onArchive).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }))
    expect(handlers.onArchive).toHaveBeenCalledWith('f1')
  })

  it('hard delete requires confirming the dialog', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).toHaveBeenCalledWith('f3')
  })

  it('does not delete when the dialog is cancelled', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/today/ManageFieldsModal.test.tsx`
Expected: new tests FAIL (no alertdialog rendered; jsdom `window.confirm`/`prompt` are unmocked and throw or return falsy).

- [ ] **Step 3: Implement in ManageFieldsModal**

In `src/components/today/ManageFieldsModal.tsx`:

1. Update imports — drop `useEffect`, add the new pieces:

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import type { CustomField, FieldConfig, FieldType } from '../../lib/database.types'
import { isCompatibleTypeChange, validateField, type FieldData } from '../../lib/fields'
import { useModal } from '../../hooks/useModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
```

2. Add a `ConfirmState` interface above the component:

```tsx
interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  action: () => void | Promise<void>
}
```

3. In the component body, remove the Escape `useEffect` (lines 127-133) and add:

```tsx
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const dialogRef = useModal(onClose)
```

4. Replace `handleSaveEdit`, `handleArchive`, and `handleDelete` (lines 156-191) with:

```tsx
  const applyEdit = async (data: FieldData) => {
    if (!editId) return
    const error = await onUpdate(editId, { ...data, show_in_charts: editForm.show_in_charts })
    if (error) { setEditError(error); return }
    setEditId(null)
  }

  const handleSaveEdit = () => {
    if (!editId) return
    const original = fields.find(f => f.id === editId)
    if (!original) return
    const data: FieldData = { name: editForm.name.trim(), type: editForm.type, config: toConfig(editForm) }
    const invalid = validateField(data, namesExcept(editId))
    if (invalid) { setEditError(invalid); return }
    setEditError(null)
    if (original.type !== data.type && !isCompatibleTypeChange(original.type, data.type)) {
      setConfirm({
        title: `Change ${original.name} to ${TYPE_LABELS[data.type]}?`,
        message: "Past values that don't match the new type will be hidden from charts (they stay in History).",
        confirmLabel: 'Change type',
        action: () => applyEdit(data),
      })
      return
    }
    void applyEdit(data)
  }

  const handleArchive = (f: CustomField) => {
    setConfirm({
      title: `Archive ${f.name}?`,
      message: 'Its history is kept and it can be restored later.',
      confirmLabel: 'Archive',
      action: async () => {
        setListError(null)
        const error = await onArchive(f.id)
        if (error) setListError(error)
      },
    })
  }

  const handleDelete = (f: CustomField) => {
    setConfirm({
      title: `Delete ${f.name} forever?`,
      message: 'This permanently deletes the field and all of its logged values. This cannot be undone.',
      confirmLabel: 'Delete forever',
      action: async () => {
        setListError(null)
        const error = await onDelete(f.id)
        if (error) setListError(error)
      },
    })
  }
```

5. Wire the dialog element: on the sheet `<div role="dialog" …>` (line 201), add `ref={dialogRef}` and `aria-labelledby="manage-fields-title"`, and give the `<h2>` (line 208) `id="manage-fields-title"`.

6. At the bottom of the sheet div (just before its closing `</div>`, after the Add-field block), render the confirm dialog:

```tsx
        {confirm && (
          <ConfirmDialog
            title={confirm.title}
            message={confirm.message}
            confirmLabel={confirm.confirmLabel}
            onConfirm={() => {
              const { action } = confirm
              setConfirm(null)
              void action()
            }}
            onCancel={() => setConfirm(null)}
          />
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/ManageFieldsModal.test.tsx`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/today/ManageFieldsModal.tsx src/components/today/ManageFieldsModal.test.tsx
git commit -m "feat: in-app confirm dialogs and accessible modal behavior in ManageFieldsModal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: ManageMedsModal — ConfirmDialog + useModal

**Files:**
- Modify: `src/components/today/ManageMedsModal.tsx`
- Test: `src/components/today/ManageMedsModal.test.tsx`

**Interfaces:**
- Consumes: `ConfirmDialog` (Task 6), `useModal` (Task 5). Props of `ManageMedsModal` are unchanged.
- Produces: no `window.confirm` in the file; the remove confirm button is labeled `Remove`.

- [ ] **Step 1: Rewrite the confirm-based tests**

In `src/components/today/ManageMedsModal.test.tsx`:

1. Add `within` to the testing-library import (line 2):

```tsx
import { render, screen, within } from '@testing-library/react'
```

2. Delete the `window.confirm` spy from `beforeEach` (lines 20-24), leaving:

```tsx
beforeEach(() => vi.clearAllMocks())
```

3. Replace the two confirm tests (lines 52-65) with:

```tsx
  it('calls onDeactivate after confirming the dialog', async () => {
    const onDeactivate = vi.fn().mockResolvedValue(null)
    render(<ManageMedsModal {...defaultProps} medications={[med]} onDeactivate={onDeactivate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeactivate).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
    expect(onDeactivate).toHaveBeenCalledWith('m1')
  })

  it('does not deactivate when the dialog is cancelled', async () => {
    const onDeactivate = vi.fn().mockResolvedValue(null)
    render(<ManageMedsModal {...defaultProps} medications={[med]} onDeactivate={onDeactivate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(onDeactivate).not.toHaveBeenCalled()
  })
```

4. In the test `'shows the error when deactivation fails'` (lines 67-73), add the dialog-confirm step after clicking Delete:

```tsx
  it('shows the error when deactivation fails', async () => {
    const onDeactivate = vi.fn().mockResolvedValue('RLS violation')
    render(<ManageMedsModal {...defaultProps} medications={[med]} onDeactivate={onDeactivate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText(/RLS violation/)).toBeInTheDocument()
    expect(screen.getByText('Lithium')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/components/today/ManageMedsModal.test.tsx`
Expected: new/changed tests FAIL (no alertdialog).

- [ ] **Step 3: Implement in ManageMedsModal**

In `src/components/today/ManageMedsModal.tsx`:

1. Update imports — drop `useEffect`, add:

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import type { Medication } from '../../lib/database.types'
import { useModal } from '../../hooks/useModal'
import { ConfirmDialog } from '../ui/ConfirmDialog'
```

2. Remove the Escape `useEffect` (lines 29-35) and add in the component body:

```tsx
  const [confirmMed, setConfirmMed] = useState<Medication | null>(null)
  const dialogRef = useModal(onClose)
```

3. Replace `handleDeactivate` (lines 73-78) with:

```tsx
  const confirmDeactivate = async (med: Medication) => {
    setListError(null)
    const error = await onDeactivate(med.id)
    if (error) setListError(error)
  }
```

and change the Delete button's handler (line 159) to `onClick={() => setConfirmMed(med)}`.

4. Wire the dialog element: on the sheet `<div role="dialog" …>` (line 85), add `ref={dialogRef}` and `aria-labelledby="manage-meds-title"`; give the `<h2>` (line 92) `id="manage-meds-title"`.

5. Before the sheet div's closing `</div>`, render:

```tsx
        {confirmMed && (
          <ConfirmDialog
            title={`Remove ${confirmMed.name}?`}
            message="Past history is kept."
            confirmLabel="Remove"
            onConfirm={() => {
              const med = confirmMed
              setConfirmMed(null)
              void confirmDeactivate(med)
            }}
            onCancel={() => setConfirmMed(null)}
          />
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/ManageMedsModal.test.tsx`
Expected: PASS (all tests, including the existing Escape-close test, now handled by `useModal`).

- [ ] **Step 5: Commit**

```bash
git add src/components/today/ManageMedsModal.tsx src/components/today/ManageMedsModal.test.tsx
git commit -m "feat: in-app confirm dialog and accessible modal behavior in ManageMedsModal

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Slider endpoint labels

**Files:**
- Modify: `src/components/ui/Slider.tsx`, `src/components/today/SleepSection.tsx`, `src/components/today/FieldSection.tsx`
- Test: `src/components/today/SleepSection.test.tsx` (existing file — add assertions)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Slider` gains optional `lowLabel?: string` and `highLabel?: string` props; when either is set, an endpoint-label row renders under the track.

- [ ] **Step 1: Write the failing test**

In `src/components/today/SleepSection.test.tsx`, add inside the existing `describe` block (the file has a `defaults` values object and renders `SleepSection` directly):

```tsx
  it('shows Poor/Great endpoint labels on sleep quality', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByText('Poor')).toBeInTheDocument()
    expect(screen.getByText('Great')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/today/SleepSection.test.tsx`
Expected: the new test FAILS (`Poor` not found).

- [ ] **Step 3: Implement**

1. `src/components/ui/Slider.tsx` — add the props and label row:

```tsx
interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min = 1, max = 10, lowLabel, highLabel, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">{value}</span>
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
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}
```

2. `src/components/today/SleepSection.tsx` — pass the labels (line 43-49):

```tsx
        <Slider
          label="Sleep quality"
          value={values.sleep_quality}
          min={1}
          max={5}
          lowLabel="Poor"
          highLabel="Great"
          onChange={v => onChange({ ...values, sleep_quality: v })}
        />
```

3. `src/components/today/FieldSection.tsx` — the slider case (lines 17-31) drops its hand-rolled label row:

```tsx
    case 'slider': {
      const min = field.config.min ?? 1
      const max = field.config.max ?? 10
      return (
        <Slider
          label={field.name}
          value={safe as number}
          min={min}
          max={max}
          lowLabel={field.config.lowLabel}
          highLabel={field.config.highLabel}
          onChange={onChange}
        />
      )
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/SleepSection.test.tsx src/components/today/FieldSection.test.tsx`
Expected: PASS — the FieldSection test asserting `calm`/`panicked` labels still passes because Slider now renders them.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Slider.tsx src/components/today/SleepSection.tsx src/components/today/FieldSection.tsx src/components/today/SleepSection.test.tsx
git commit -m "feat: slider endpoint labels; Poor/Great anchors on sleep quality

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Stepper label dedup + descriptive aria-labels

**Files:**
- Modify: `src/components/ui/Stepper.tsx`
- Test: `src/components/today/FieldSection.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Stepper` props unchanged (`label` is still required) but the label is no longer rendered visibly; the buttons are named `Decrease {label}` / `Increase {label}`.

- [ ] **Step 1: Update the test to the new accessible names**

In `src/components/today/FieldSection.test.tsx`, in `'renders a stepper for number fields and increments'` (line 27), change:

```tsx
    await userEvent.click(screen.getByRole('button', { name: '+' }))
```

to:

```tsx
    await userEvent.click(screen.getByRole('button', { name: 'Increase Coffee' }))
```

and add an assertion that the field name appears exactly once:

```tsx
    expect(screen.getAllByText('Coffee')).toHaveLength(1)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/today/FieldSection.test.tsx`
Expected: FAIL — button named `Increase Coffee` not found (current aria-label is `+`), and `Coffee` appears twice.

- [ ] **Step 3: Implement**

Replace `src/components/ui/Stepper.tsx` with:

```tsx
interface StepperProps {
  label: string
  value: number
  unit?: string
  onChange: (value: number) => void
}

export function Stepper({ label, value, unit, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => value > 0 && onChange(value - 1)}
        aria-label={`Decrease ${label}`}
        className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40"
        disabled={value === 0}
      >
        −
      </button>
      <span className="text-xl font-semibold w-6 text-center dark:text-white">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
        className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300"
      >
        +
      </button>
      {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
    </div>
  )
}
```

(The visible `{label}` span and the `ml-auto` wrapper are removed; `FieldSection`'s `<h2>` already names the field.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/FieldSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Stepper.tsx src/components/today/FieldSection.test.tsx
git commit -m "fix: remove duplicated Stepper label, add descriptive button labels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Skeleton loading states

**Files:**
- Create: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/today/TodayPage.tsx`, `src/components/history/HistoryPage.tsx`, `src/components/charts/ChartsPage.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<Skeleton className="…" />` — an `aria-hidden` pulsing placeholder block; size it via className.

- [ ] **Step 1: Create the Skeleton component**

Create `src/components/ui/Skeleton.tsx`:

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  )
}
```

- [ ] **Step 2: Replace the loading states**

1. `src/components/today/TodayPage.tsx` — import `Skeleton` and replace the loading return (line 81):

```tsx
  if (loading || yesterdayLoading || fieldsLoading || valuesLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-56" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    )
  }
```

2. `src/components/history/HistoryPage.tsx` — import `Skeleton` and replace the loading return (line 71):

```tsx
  if (loading || fieldsLoading || valuesLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }
```

3. `src/components/charts/ChartsPage.tsx` — import `Skeleton` and replace the inline loading div (line 81):

```tsx
      {loading && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      )}
```

- [ ] **Step 3: Run the affected tests**

Run: `npx vitest run src/components/today/TodayPage.test.tsx`
Expected: PASS (loading is mocked to `false` in these tests, so nothing depends on the "Loading…" text).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Skeleton.tsx src/components/today/TodayPage.tsx src/components/history/HistoryPage.tsx src/components/charts/ChartsPage.tsx
git commit -m "feat: skeleton loading states on Today, History, and Charts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Dark-mode consistency, focus rings, touch targets

**Files:**
- Create: `src/lib/styles.ts`
- Modify: `src/components/layout/AppShell.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/history/HistoryPage.tsx`, `src/components/today/MedsSection.tsx`, `src/components/today/ManageFieldsModal.tsx`, `src/components/today/ManageMedsModal.tsx`, `src/components/today/TodayPage.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `focusRing` string constant from `src/lib/styles.ts`:

```ts
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
```

This task is mechanical class edits; no behavior changes and no new tests. Apply each edit exactly.

- [ ] **Step 1: Create `src/lib/styles.ts`** with the `focusRing` constant above.

- [ ] **Step 2: AppShell (`src/components/layout/AppShell.tsx`)** — import `focusRing` from `../../lib/styles`; enlarge targets and add rings:

- Theme toggle button (line 19): className becomes

```tsx
className={`p-2 -m-1 text-gray-500 dark:text-gray-400 rounded-lg ${focusRing}`}
```

- Sign-out button (line 27): className becomes

```tsx
className={`p-2 -m-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg ${focusRing}`}
```

- [ ] **Step 3: BottomNav (`src/components/layout/BottomNav.tsx`)** — import `focusRing`; the NavLink className function (line 18) becomes:

```tsx
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-1 text-xs font-medium ${focusRing} ${
              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`
          }
```

- [ ] **Step 4: HistoryPage (`src/components/history/HistoryPage.tsx`)**

- Export toggle (line 85): `className="text-sm text-blue-600 dark:text-blue-400 font-medium"`
- Load error (line 76): `className="text-center text-red-500 dark:text-red-400 mt-12"`
- Export error (line 133): `className="text-red-600 dark:text-red-400 text-xs"`

- [ ] **Step 5: MedsSection (`src/components/today/MedsSection.tsx`)**

- Line 49 and 95: `text-red-500` → `text-red-500 dark:text-red-400`
- Line 53: `text-blue-600 underline` → `text-blue-600 dark:text-blue-400 underline`
- Also scan the file for any `Manage` link with `text-blue-600` and add `dark:text-blue-400` if missing.

- [ ] **Step 6: ManageFieldsModal (`src/components/today/ManageFieldsModal.tsx`)** — import `focusRing` where used:

- Close button: className becomes `` `p-2 -m-2 text-gray-500 dark:text-gray-400 rounded-lg ${focusRing}` ``
- Move up/down chevron buttons: className becomes `` `p-2 -m-1 text-gray-500 dark:text-gray-400 disabled:opacity-30 rounded ${focusRing}` ``
- `Edit` and `Restore` buttons: `text-blue-600 text-sm` → `text-blue-600 dark:text-blue-400 text-sm`
- `Archive` and `Delete forever` buttons: `text-red-500 text-sm` → `text-red-500 dark:text-red-400 text-sm`
- All `text-red-500 text-xs` error paragraphs: add `dark:text-red-400`

- [ ] **Step 7: ManageMedsModal (`src/components/today/ManageMedsModal.tsx`)** — same treatment:

- Close button: `` `p-2 -m-2 text-gray-500 dark:text-gray-400 rounded-lg ${focusRing}` ``
- `Edit` button: add `dark:text-blue-400`
- `Delete` button: add `dark:text-red-400`
- Error paragraphs (`text-red-500 text-xs`): add `dark:text-red-400`

- [ ] **Step 8: TodayPage (`src/components/today/TodayPage.tsx`)** — import `focusRing`; add `` rounded-lg ${focusRing} `` to the Previous day / Next day arrow buttons, the Today link, the Manage fields button, and the load-error line (line 86) gets `text-red-500 dark:text-red-400`.

- [ ] **Step 9: Verify**

Run: `npm test && npm run lint`
Expected: all tests PASS, no lint errors.

- [ ] **Step 10: Commit**

```bash
git add src/lib/styles.ts src/components
git commit -m "fix: dark-mode color consistency, focus rings, larger touch targets

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: iOS safe area

**Files:**
- Modify: `index.html`, `src/components/layout/BottomNav.tsx`, `src/components/layout/AppShell.tsx`

**Interfaces:** none.

- [ ] **Step 1: Viewport meta**

In `index.html` line 6, change:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] **Step 2: BottomNav padding**

In `src/components/layout/BottomNav.tsx` line 12, the nav className becomes:

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex pb-[env(safe-area-inset-bottom)]">
```

- [ ] **Step 3: AppShell spacer**

In `src/components/layout/AppShell.tsx` line 15, change `pb-20` to `pb-[calc(5rem+env(safe-area-inset-bottom))]`:

```tsx
<div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-[calc(5rem+env(safe-area-inset-bottom))]">
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds (env() arbitrary values are valid Tailwind v4).

- [ ] **Step 5: Commit**

```bash
git add index.html src/components/layout/BottomNav.tsx src/components/layout/AppShell.tsx
git commit -m "fix: respect iOS safe-area inset in bottom nav

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all test files PASS, zero failures.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `tsc -b` clean, Vite build succeeds.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev` and verify in the browser (light and dark mode):
1. Today: edit the sleep-quality slider → "Saving…" then "Saved ✓" appears without pressing anything; reload → the value persisted.
2. Today: ‹ steps to yesterday ("Yesterday" heading), › returns, › is disabled on today; tapping the heading opens the date picker; "Today" link appears on past dates.
3. History: dates read "Yesterday" / "Tue, Jul 1"; export panel still works.
4. Manage fields: Archive shows the in-app dialog; Escape closes only the dialog (not the sheet); delete-forever no longer asks to type DELETE.
5. Bottom nav shows focus ring when tabbing; loading shows skeletons instead of "Loading…".

- [ ] **Step 5: Report results to the user** (no commit; nothing should have changed).
