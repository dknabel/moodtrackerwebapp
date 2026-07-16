# UI Improvements Design

**Date:** 2026-07-15
**Status:** Approved

## Goal

Address 13 UI issues found in review, grouped into four feature changes and a set of
mechanical fixes. Decisions made during brainstorming: autosave (no Save button),
arrows + tap-to-pick date navigation, and a reusable in-app confirm dialog.

## 1. Autosave on the Today page

Replaces the manual Save button and fixes silent data loss on navigation.

- `LogForm` (in `src/components/today/TodayPage.tsx`) no longer renders a Save button.
- Every form change starts/restarts a ~1000ms debounce timer. When it fires, the
  existing save logic runs: `save(toSleepData(form))` and `saveValues(form.fieldValues)`
  in parallel.
- Saves are sequenced through a promise-chain ref so a slow in-flight save cannot race
  a newer one; each debounce fire saves the latest form snapshot.
- A pending (debounced but unfired) save flushes on unmount. Because `LogForm` is keyed
  by date, this also covers date switches and route changes.
- Save status indicator in the page header row, right-aligned where the button used to
  free space: idle → nothing; "Saving…" (gray); "Saved ✓" (fades after ~2s); on error, a
  persistent red message with a Retry button that re-runs the save.
- `MedsSection` already persists on tap and is unchanged.

## 2. Date navigation and friendly date formatting

- Today header becomes `‹ [date] ›`:
  - `‹` / `›` step one day back/forward; `›` is disabled when viewing today.
  - Tapping the date opens a native date picker (`<input type="date">`, `max` = today).
  - A small "Today" link appears when viewing a past date.
  - Future dates are unreachable (arrow disabled + picker max).
- Routing is unchanged: `/` for today, `/log/:date` for other days.
- New shared helper `formatDay(dateStr)` in `src/lib/dates.ts`: returns
  "Today", "Yesterday", or "Tue, Jul 1" (append ", 2025" style year when not the
  current year). Used by the Today header and `HistoryEntry`.

## 3. ConfirmDialog

New `src/components/ui/ConfirmDialog.tsx`: centered overlay dialog with title, message,
Cancel button, and a red confirm button. Props: `title`, `message`, `confirmLabel`,
`onConfirm`, `onCancel`. Escape and overlay click cancel; initial focus on Cancel.

Replaces all three native dialogs in `ManageFieldsModal`:

- Archive field (`window.confirm`)
- Delete forever (`window.prompt` type-DELETE — becomes a strongly-worded single
  confirm; structural friction remains because delete is only reachable from the
  archived list)
- Incompatible type-change warning (`window.confirm`)

## 4. Modal accessibility

Shared modal-behavior hook `src/hooks/useModal.ts` providing:

- Body scroll lock while open
- Focus moved into the dialog on open, restored on close
- Tab focus trap
- Escape to close

Applied to `ManageFieldsModal`, `ManageMedsModal`, and `ConfirmDialog`, plus
`aria-labelledby` wiring to each dialog's heading.

## 5. Mechanical fixes

- **Touch targets:** add `p-2` (≥40px hit area) to the header theme toggle and sign-out
  buttons (`AppShell`), modal close X, and field reorder chevrons.
- **Focus styles:** shared `focus-visible:ring-2 focus-visible:ring-blue-500` class
  constant applied to buttons, tag chips, and nav links.
- **Slider labels:** `Slider` gains optional `lowLabel`/`highLabel` props rendering an
  endpoint-label row under the track. `SleepSection` passes "Poor"/"Great" for sleep
  quality; `FieldSection` drops its hand-rolled label row and uses the same props.
- **Stepper label duplication:** remove the visible label span (the `FieldSection`
  `<h2>` already names the field); keep the name for
  `aria-label="Decrease/Increase {name}"` on the − / + buttons.
- **Skeleton loading:** new `src/components/ui/Skeleton.tsx` (animated pulse blocks).
  Today, History, and Charts replace centered "Loading…" text with rough skeleton
  layouts matching their card structure.
- **Dark-mode consistency:** `dark:text-blue-400` on all blue text links and the active
  bottom-nav tab; `dark:text-red-400` on error text.
- **iOS safe area:** add `viewport-fit=cover` to the viewport meta in `index.html`;
  `pb-[env(safe-area-inset-bottom)]` on `BottomNav`; bump `AppShell` bottom padding to
  account for it.

## Testing

- Update existing tests: `TodayPage.test.tsx` (autosave via fake timers instead of Save
  button), `ManageFieldsModal.test.tsx` (ConfirmDialog flows instead of
  `window.confirm`/`prompt` mocks), History tests touching date rendering.
- New tests: `formatDay`, `ConfirmDialog`, debounce/flush-on-unmount behavior.
- Verification: `npm test`, `npm run lint`, `npm run build`.

## Out of scope

- Desktop-specific layout, PWA/offline support, History grouping by week/month,
  autosave for auth forms.
