# Medication Checkbox-Only Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the exact-time entry step from daily medication logging so checking a medication's checkbox is the entire interaction.

**Architecture:** `MedsSection.tsx` currently shows a `<input type="time">` next to a medication once its checkbox is checked, and `useMedicationLogs.ts`'s `setTaken` persists that value to `MedicationLog.taken_at`. Both the time input and the `takenAt` parameter are removed; the upsert now always writes `taken_at: null`. The `taken_at` DB column and TS type field are left in place (unused) — out of scope per the design doc.

**Tech Stack:** React 19 + TypeScript, Vitest + Testing Library, Supabase client.

## Global Constraints

- Do not drop or migrate the `taken_at` DB column or its field in `MedicationLog` (`src/lib/database.types.ts`) — out of scope per `docs/superpowers/specs/2026-07-17-med-checkbox-only-design.md`.
- Do not change `scheduled_time` or `ManageMedsModal` behavior.

---

### Task 1: Remove exact-time entry from medication logging

**Files:**
- Modify: `src/hooks/useMedicationLogs.ts:11-26`
- Modify: `src/hooks/useMedicationLogs.test.ts`
- Modify: `src/components/today/MedsSection.tsx:27-31,60-90`
- Modify: `src/components/today/MedsSection.test.tsx`

**Interfaces:**
- Produces: `useMedicationLogs(date: string).setTaken(medicationId: string, taken: boolean): Promise<string | null>` — the `takenAt` parameter is removed; callers no longer pass a third argument.

- [ ] **Step 1: Update the hook test to expect a 2-argument `setTaken`**

Edit `src/hooks/useMedicationLogs.test.ts`. Replace the `log1Taken` constant and the two tests that call `setTaken` with three arguments:

```typescript
const log1Taken = { ...log1, taken: true }
```

```typescript
  it('setTaken upserts and updates local state', async () => {
    mockSelectForFetch.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [log1], error: null }),
    })
    mockSingle.mockResolvedValue({ data: log1Taken, error: null })

    const { result } = renderHook(() => useMedicationLogs('2026-06-24'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.setTaken('m1', true)
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ medication_id: 'm1', taken: true, taken_at: null, date: '2026-06-24' }),
      expect.objectContaining({ onConflict: 'user_id,date,medication_id' })
    )
    expect(result.current.logs[0].taken).toBe(true)
  })

  it('setTaken returns the error message and keeps state when the upsert fails', async () => {
    mockSelectForFetch.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [log1], error: null }),
    })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'upsert failed' } })

    const { result } = renderHook(() => useMedicationLogs('2026-06-24'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = null
    await act(async () => {
      returned = await result.current.setTaken('m1', true)
    })

    expect(returned).toBe('upsert failed')
    expect(result.current.logs[0].taken).toBe(false)
  })
```

The other two tests in the file (`fetches logs for the given date`, `returns empty array when no logs exist`) are unchanged.

- [ ] **Step 2: Run the hook test to verify it fails**

Run: `npx vitest run src/hooks/useMedicationLogs.test.ts`
Expected: FAIL — `mockUpsert` was called with `taken_at: '08:30'` (from the still-3-arg implementation... actually the test now calls `setTaken('m1', true)` with `takenAt` `undefined`, so the assertion `taken_at: null` fails because the current implementation writes `taken_at: undefined`).

- [ ] **Step 3: Update `useMedicationLogs.ts`**

Replace `setTaken` in `src/hooks/useMedicationLogs.ts`:

```typescript
  const setTaken = async (
    medicationId: string,
    taken: boolean
  ): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const { data: upserted, error } = await supabase
      .from('medication_logs')
      .upsert(
        { user_id: auth.user.id, date, medication_id: medicationId, taken, taken_at: null },
        { onConflict: 'user_id,date,medication_id' }
      )
      .select()
      .single()
    if (error) return error.message
    if (upserted) {
      mutate(prev => {
        const logs = prev ?? []
        const idx = logs.findIndex(l => l.medication_id === medicationId)
        if (idx >= 0) return logs.map((l, i) => (i === idx ? upserted : l))
        return [...logs, upserted]
      })
    }
    return null
  }
```

- [ ] **Step 4: Run the hook test to verify it passes**

Run: `npx vitest run src/hooks/useMedicationLogs.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Update the component test to match checkbox-only behavior**

Edit `src/components/today/MedsSection.test.tsx`. Replace the `'calls setTaken(id, true, null)...'` test and the `'shows time input when medication is marked taken'` test:

```typescript
  it('calls setTaken(id, true) when unchecked checkbox is toggled', async () => {
    mockUseMedications.mockReturnValue({
      medications: [med],
      loading: false,
      error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    render(<MedsSection date="2026-06-24" />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(mockSetTaken).toHaveBeenCalledWith('m1', true)
  })

  it('does not render a time input when medication is marked taken', () => {
    mockUseMedications.mockReturnValue({
      medications: [med],
      loading: false,
      error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    mockUseMedicationLogs.mockReturnValue({
      logs: [{ id: 'l1', user_id: 'u1', date: '2026-06-24', medication_id: 'm1', taken: true, taken_at: null, created_at: '' }],
      loading: false,
      error: null,
      setTaken: mockSetTaken,
    })
    const { container } = render(<MedsSection date="2026-06-24" />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(container.querySelectorAll('input').length).toBe(1)
  })
```

All other tests in the file (`shows empty state prompt...`, `renders medication name and dose`, `keeps the section heading visible while loading`, `shows a fetch error instead of the empty state`, `shows an error when marking a medication taken fails`) are unchanged.

- [ ] **Step 6: Run the component test to verify it fails**

Run: `npx vitest run src/components/today/MedsSection.test.tsx`
Expected: FAIL — `setTaken` is called with `('m1', true, null)` (3 args) so `toHaveBeenCalledWith('m1', true)` fails, and the time-input test fails because `container.querySelectorAll('input').length` is `2` (checkbox + time input).

- [ ] **Step 7: Update `MedsSection.tsx`**

Replace `handleSetTaken` (currently lines 27-31):

```typescript
  const handleSetTaken = async (medicationId: string, taken: boolean) => {
    setTakenError(null)
    const error = await setTaken(medicationId, taken)
    if (error) setTakenError(error)
  }
```

Replace the medication list rendering (currently lines 60-90):

```typescript
            {medications.map(med => {
              const log = getLog(med.id)
              const taken = log?.taken ?? false

              return (
                <div key={med.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={taken}
                    onChange={e => handleSetTaken(med.id, e.target.checked)}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                  <span className="flex-1 text-sm text-gray-900 dark:text-white">
                    {med.name} — {med.dose}
                    {med.scheduled_time && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        @ {formatTime(med.scheduled_time)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
```

- [ ] **Step 8: Run the component test to verify it passes**

Run: `npx vitest run src/components/today/MedsSection.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 9: Run the full verification suite**

Run: `npm test && npm run lint && npm run build`
Expected: all three succeed with no failures/errors.

- [ ] **Step 10: Commit**

```bash
git add src/hooks/useMedicationLogs.ts src/hooks/useMedicationLogs.test.ts \
        src/components/today/MedsSection.tsx src/components/today/MedsSection.test.tsx
git commit -m "$(cat <<'EOF'
feat: log medications with a checkbox only, no time entry

Checking a medication as taken no longer prompts for the exact time —
taken_at is now always written as null.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Testing

Covered within Task 1: hook unit tests (`useMedicationLogs.test.ts`), component tests (`MedsSection.test.tsx`), plus `npm test`, `npm run lint`, and `npm run build` as the final gate.

## Out of scope

- Dropping the `taken_at` DB column or TS type field.
- Any change to `scheduled_time` or `ManageMedsModal`.
