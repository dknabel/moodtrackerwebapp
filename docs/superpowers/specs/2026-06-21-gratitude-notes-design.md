# Gratitude Notes — Design Spec

**Date:** 2026-06-21

## Summary

Add a daily gratitude note to the mood tracker. Users write a single free-text note per day on the Today page and can read back past notes in the History view.

---

## Data Model

Add one nullable text column to the existing `daily_logs` table:

```sql
ALTER TABLE daily_logs ADD COLUMN gratitude text;
```

Update `src/lib/database.types.ts`:

```ts
export interface DailyLog {
  // ... existing fields ...
  gratitude: string | null
}
```

`DailyLogUpdate` is already `Partial<Omit<DailyLogInsert, ...>>`, so the new field is automatically included with no further type changes. The existing `useDailyLog` hook's `save()` function requires no changes.

---

## Today Page — GratitudeSection

A new `GratitudeSection` component following the same pattern as `MoodSection`, `SleepSection`, etc.

- Single `<textarea>` with placeholder: "What are you grateful for today?"
- 4 rows tall (fixed height, no auto-resize)
- Added to `TodayPage` below the Sleep section, separated by an `<hr>`
- `gratitude: string` added to `FormState` (empty string default)
- Initialized from `log.gratitude ?? ''` in the existing `useEffect`
- Passed to `save()` as `gratitude: form.gratitude || null` (store null for empty strings)
- Saved by the existing Save button — no change to the save flow

---

## History Card Preview

In `HistoryEntry`, if `log.gratitude` is non-null and non-empty, render a truncated preview on its own line below the stats row:

- Truncated at 80 characters with `…` appended if longer
- Styled in italics, `text-xs text-gray-500`
- Rendered inside quotes: `"Sunny weather, a good run…"`

The stats row is unchanged when there is no gratitude note.

---

## Out of Scope

- Multiple gratitude entries per day
- Gratitude-specific charts or analytics
- Search or filtering by note content
