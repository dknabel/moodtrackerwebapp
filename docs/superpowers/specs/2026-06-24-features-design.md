# Feature Design: Medication Tracking, Correlations, Export, Streaks

**Date:** 2026-06-24  
**Status:** Approved

---

## Overview

Four features added to the bipolar mood tracker PWA (React 19 + TypeScript + Vite + Supabase + Recharts + Tailwind v4):

1. Medication tracking (new Supabase tables + TodayPage section)
2. Correlations insight (client-side computation + Charts page section)
3. Data export — CSV + PDF (client-side, History page)
4. Streaks & stats (client-side computation + Charts page section)

---

## 1. Data Model

### New Supabase tables

**`medications`** — user's medication list (managed once, reused daily):

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | references auth.users |
| name | text | e.g. "Lithium" |
| dose | text | e.g. "300mg" |
| scheduled_time | time | e.g. "08:00" |
| active | boolean | false = soft-deleted |
| created_at | timestamptz | |

**`medication_logs`** — one row per medication per day:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| date | date | 'YYYY-MM-DD' |
| medication_id | uuid FK | references medications |
| taken | boolean | |
| taken_at | time | nullable, actual time taken |
| created_at | timestamptz | |

Unique constraint on `(user_id, date, medication_id)`.

### Existing tables

`daily_logs` is unchanged. All streak and correlation computations are done client-side on data already fetched.

### TypeScript types (additions to `database.types.ts`)

```ts
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
  date: string
  medication_id: string
  taken: boolean
  taken_at: string | null  // 'HH:MM'
  created_at: string
}

export type MedicationInsert = Omit<Medication, 'id' | 'created_at'>
export type MedicationLogUpsert = Omit<MedicationLog, 'id' | 'created_at'>
```

---

## 2. Medication Tracking

### TodayPage section order (updated)

1. Mood
2. Food
3. **Meds** (new)
4. Sleep
5. Exercise
6. Gratitude

### `MedsSection` component

Appears on TodayPage between Food and Sleep sections.

**When no medications configured:** renders a prompt — "No medications added. Tap the gear to add yours."

**When medications exist:** renders a list of active medications, each as a row:
- Checkbox (`taken`)
- Name + dose + scheduled time
- Time input (appears only when checked) for `taken_at`

A gear icon in the section header opens `ManageMedsModal`.

Saving is **immediate on toggle** (no Save button) — each change calls `useMedicationLogs.setTaken()` directly. This is intentionally separate from the main TodayPage Save flow.

### `ManageMedsModal` component

Inline modal (not a separate route). Contains:
- List of active medications with Edit and Delete (soft-delete sets `active = false`)
- "Add medication" inline form: name (required), dose (required), scheduled time (optional)
- Editing replaces the row with an inline form

### Hooks

**`useMedications()`**
- Fetches all active medications for the current user (`active = true`, ordered by `created_at`)
- Exposes: `medications`, `loading`, `addMedication(data)`, `updateMedication(id, data)`, `deactivateMedication(id)`

**`useMedicationLogs(date: string)`**
- Fetches all medication_logs rows for the current user on a given date
- Exposes: `logs`, `loading`, `setTaken(medicationId, taken, takenAt)`
- `setTaken` upserts on `(user_id, date, medication_id)`

**`useMedicationLogsBulk(fromDate: string, toDate: string)`**
- Fetches all medication_logs rows for the current user across a date range
- Exposes: `logs`, `loading`
- Used by the streaks computation (365-day window) and the export feature

---

## 3. Correlations Insight

### Location

New section on the **Charts page**, below the existing four time-series charts. Uses the same date range (7/30/90 days) already selected by the user.

### Computed correlations

All computed client-side from `chronologicalLogs` (already fetched for charts). Cards are hidden if fewer than 5 data points are available.

| Card | X variable | Y variable | Split |
|---|---|---|---|
| Exercise vs Mood | `exercised` (boolean) | `mood_rating` | Exercise days vs non-exercise days |
| Sleep vs Mood | `sleep_hours` | `mood_rating` | <7h vs ≥7h |
| Meals vs Mood | `meals_count` | `mood_rating` | ≤2 meals vs ≥3 meals |
| Sleep Quality vs Energy | `sleep_quality` | `mood_energy` | quality ≤2 vs ≥3 (1–5 scale) |

### Card layout

Each correlation card contains:
- **Headline** — plain-language summary: *"On days you exercised, mood averaged 7.2 vs 5.1"*
- **Scatter plot** — Recharts `ScatterChart`, X axis = independent variable, Y axis = dependent variable, dots colored by group (e.g. exercised = blue, not exercised = gray)

### New component

`CorrelationsSection` — receives `logs: DailyLog[]`, computes stats internally (no new hook needed), renders cards.

A pure utility function `computeCorrelation(logs, xKey, yKey, splitFn)` handles the arithmetic and is unit-testable independently.

---

## 4. Data Export

### Location

**Export button** in the History page header (top right). Opens a simple inline options panel (not a modal) with:
- **Date range:** Last 30 days / Last 90 days / All time (2020-01-01 → today)
- **Format:** CSV / PDF
- A **Download** button

Export fetches logs for the selected range on demand (not from existing page state, since the History page only shows 90 days).

### CSV

Generated entirely client-side with no library. Column order:

```
date, mood_rating, mood_energy, mood_anxiety, meals_count,
<med_name (dose)> per active medication...,
exercised, sleep_hours, sleep_quality, bedtime, wake_time,
tonight_bedtime, gratitude
```

Downloaded via a `<a download>` blob URL (`text/csv`).

### PDF

Generated client-side using `jspdf` + `jspdf-autotable`. Same column layout as CSV. Header contains app name and date range subtitle. One page per ~25 rows (autotable handles pagination automatically).

New dependency: `jspdf` + `jspdf-autotable`.

### New utility

`exportLogs(logs, medications, medicationLogs, format, filename)` — pure function that takes the data and triggers the download. Lives in `src/lib/export.ts`.

---

## 5. Streaks & Stats

### Location

New **Stats section** on the **Charts page**, positioned above the Correlations section. Not affected by the date range selector — always reflects a rolling 365-day window (fetched via a separate `useLogs` call).

### Three stat cards (displayed in a row)

| Card | Label | Metric |
|---|---|---|
| Logging streak | "Logging" | Consecutive days with a `daily_logs` row |
| Exercise streak | "Exercise" | Consecutive days where `exercised = true` |
| Meds streak | "Medications" | Consecutive days where all active meds were `taken = true` |

Each card shows:
- Current streak (number of days)
- Longest streak ever (within the 365-day window)

No emojis. Text-only cards.

### Hook: `useStreaks(logs, medicationLogs, medications)`

Pure client-side computation. Takes:
- `logs: DailyLog[]` — 365-day window, newest-first (from existing `useLogs`)
- `medicationLogs: MedicationLog[]` — 365-day window (from `useMedicationLogsBulk`)
- `medications: Medication[]` — active med list

Returns `{ logging, exercise, meds }` each as `{ current: number, longest: number }`.

A streak breaks on the first missing or non-qualifying day working backwards from today.

---

## File Structure (new files)

```
src/
  lib/
    database.types.ts         (updated — add Medication, MedicationLog types)
    export.ts                 (new — exportLogs utility)
  hooks/
    useMedications.ts         (new)
    useMedicationLogs.ts      (new — single-date fetch + setTaken)
    useMedicationLogsBulk.ts  (new — date-range fetch for streaks + export)
    useStreaks.ts              (new)
  components/
    today/
      MedsSection.tsx         (new)
      ManageMedsModal.tsx     (new)
    charts/
      CorrelationsSection.tsx (new)
      StatsSection.tsx        (new)
    history/
      HistoryPage.tsx         (updated — add export button + options panel)
    layout/
      AppShell.tsx            (likely unchanged)
      BottomNav.tsx           (unchanged)
  App.tsx                     (unchanged)
```

---

## Out of Scope

- Push notifications (deferred)
- Episode tagging
- Server-side export generation
- Medication reminders / alerts
