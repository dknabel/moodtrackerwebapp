# Medication Logging: Checkbox-Only Design

**Date:** 2026-07-17
**Status:** Approved

## Goal

Remove the exact-time entry step from daily medication logging. Checking a
medication's checkbox on the Today page should be the entire interaction —
no follow-up time input to fill in or remember.

## Change

`MedsSection.tsx` currently shows a `<input type="time">` next to a
medication once its checkbox is checked (lines 81-88), writing that value to
`MedicationLog.taken_at`. This input is removed. Checking the box just marks
the medication taken for the day.

- **`src/components/today/MedsSection.tsx`** — delete the conditional time
  input block. `handleSetTaken` drops its `takenAt` argument and always
  calls `setTaken(medicationId, taken)`.
- **`src/hooks/useMedicationLogs.ts`** — `setTaken` drops its `takenAt`
  parameter; the upsert always writes `taken_at: null`.
- **Tests** — `useMedicationLogs.test.ts` and `MedsSection.test.tsx` drop
  fixtures/assertions that exercise the time input or a non-null
  `taken_at` value coming from user interaction.

## Out of scope

- Dropping the `taken_at` column or the `MedicationLog.taken_at` type field.
  Nothing besides the removed UI writes to it (`useStreaks.ts` and
  `export.ts` only read the `taken` boolean), so it's harmless unused
  schema rather than a footgun. A migration to drop it can be a follow-up
  if desired.
- Any change to `scheduled_time` (the medication's configured reminder
  time) or `ManageMedsModal` — unaffected, still shown as context next to
  the medication name.

## Testing

- Update `useMedicationLogs.test.ts` and `MedsSection.test.tsx` per above.
- Verification: `npm test`, `npm run lint`, `npm run build`.
