---
title: Sleep Section — Two Explicit Sub-Sections
date: 2026-06-22
status: approved
---

## Problem

The daily log's sleep fields (`bedtime`, `wake_time`, `sleep_hours`, `sleep_quality`) are ambiguous: a single date's sleep spans two calendar days, so it is unclear whether `bedtime` refers to last night (the sleep you just woke from) or tonight (the sleep you're about to have).

The previous fix — reordering fields and adding a context label based on time of day — was cosmetic. It did not resolve the data model ambiguity and produced different UI depending on when the user happened to open the form.

## Goal

Capture two distinct sleep events per daily log:

1. **Last night's sleep** — the completed sleep period that ended on this date (bedtime from the night before, wake time this morning, hours, quality).
2. **Tonight's bedtime** — the time the user goes to bed starting this calendar date's night (single field; wake time and quality will be part of tomorrow's "last night" entry).

## Data Model

Add one column to `daily_logs`:

```sql
ALTER TABLE daily_logs ADD COLUMN tonight_bedtime time;
```

The existing `bedtime` field retains its name and type but gets a fixed semantic: the bedtime that preceded `wake_time` on this date (i.e., last night's bedtime). No other schema changes.

Updated `DailyLog` type:

```ts
tonight_bedtime: string | null  // 'HH:MM:SS' from Postgres time type
```

## Auto-Populate Bedtime

`tonight_bedtime` on Day N and `bedtime` on Day N+1 represent the same sleep event. To avoid double entry, `TodayPage` auto-populates `bedtime` from the previous day's log:

- Fetch yesterday's log alongside today's (second `useDailyLog` call with `date - 1 day`).
- After today's log loads, if `form.bedtime` is empty and `yesterday.tonight_bedtime` is set, copy `tonight_bedtime` into `form.bedtime`.
- The user sees the pre-filled value and can accept or override it.

## UI

The Sleep section renders two clearly labeled sub-sections, always visible, with no time-of-day logic.

```
Sleep
─────────────────────────────
Last night's sleep

  Wake time    Bedtime
  [07:00]      [23:00]

  Hours slept (8h)
  [  8  ]

  Sleep quality
  ●────○────○────○────○
  1    2    3    4    5

─────────────────────────────
Tonight

  Bedtime
  [22:30]
```

Wake time appears first in "Last night's sleep" because it is the anchor datum known immediately upon waking. "Tonight" is a single field — hours and quality cannot be known until the next morning.

## Components Affected

| File | Change |
|------|--------|
| `src/lib/database.types.ts` | Add `tonight_bedtime: string \| null` to `DailyLog` |
| `src/components/today/SleepSection.tsx` | Remove `getTimeOfDay()` and time-of-day logic; restructure into two sub-sections; add `tonight_bedtime` to `SleepValues` |
| `src/components/today/TodayPage.tsx` | Add `tonight_bedtime` to `FormState` and `DEFAULT_FORM`; fetch yesterday's log; auto-populate `bedtime` if empty |
| `src/hooks/useDailyLog.ts` | No changes required (`DailyLogUpdate` is already `Partial<...>`) |
| Database | SQL migration to add `tonight_bedtime` column |

## Testing

- **`SleepSection.test.tsx`** — remove field-order and time-of-day tests; add tests that both sub-sections render; `tonight_bedtime` propagates through `onChange`; auto-calc of `sleep_hours` still works from the "Last night" fields.
- **`TodayPage`** (or a dedicated hook test) — verify auto-populate: when today's `bedtime` is empty and yesterday's `tonight_bedtime` is set, `form.bedtime` is pre-filled after load.
- **`sleep.test.ts`** — no changes needed.

## Out of Scope

- History page display of `tonight_bedtime` (can be added later).
- Charts for `tonight_bedtime` (can be added later).
- Any changes to `sleep_hours` calculation logic.
