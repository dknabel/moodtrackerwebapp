# Capacitor Native Wrap + Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the existing web app with Capacitor to run as real iOS and Android apps, and add user-configurable local notifications for daily-log and medication reminders.

**Architecture:** A new `reminders` Supabase table (RLS-scoped per user) backs a Reminders screen where users create daily-log reminders and toggle medication reminders. A thin Capacitor wrapper (`ios/`, `android/` native projects, bundled `dist/` build) loads the unmodified React app. A pure reconciliation module cancels and re-schedules native local notifications from the current reminder list on every app launch/foreground, using `@capacitor/local-notifications`.

**Tech Stack:** Capacitor 7 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/local-notifications`, `@capacitor/app`), existing React 19 / Vite / Supabase / Tailwind stack, Vitest + Testing Library.

## Global Constraints

- Bundled loading model: `capacitor.config.ts` has `webDir: 'dist'` and no `server.url` (per spec — avoids PWA service worker / Capacitor WebView conflicts, works offline for the shell).
- No push notifications / server-sent infrastructure — everything is scheduled locally on-device from user-set times.
- Reminder settings are synced via Supabase (`reminders` table), not local-only device storage.
- RLS on `reminders` follows the exact pattern used by `medications` in `supabase/migrations/001_medications.sql`: `using (auth.uid() = user_id)`.
- Distribution (App Store / Play Store submission) is explicitly out of scope for this plan.
- Follow existing code patterns exactly: hooks mirror `src/hooks/useMedications.ts` (built on `useSupabaseQuery`), UI mirrors `src/components/today/ManageMedsModal.tsx` styling (Tailwind utility classes, `focusRing` from `src/lib/styles.ts`, dark-mode variants on every color class).

---

## File Structure

**Data layer:**
- `supabase/migrations/003_reminders.sql` — new table (create)
- `src/lib/database.types.ts` — add `Reminder`, `ReminderKind`, `ReminderInsert`/update types (modify)
- `src/hooks/useReminders.ts` — CRUD hook, mirrors `useMedications.ts` (create)
- `src/hooks/useReminders.test.ts` — tests (create)

**Capacitor scaffold:**
- `package.json` — add Capacitor deps + `cap:*` scripts (modify)
- `capacitor.config.ts` — Capacitor config (create)
- `ios/`, `android/` — generated native projects (create, via CLI)

**Notification scheduling:**
- `src/lib/notifications.ts` — pure reconciliation + permission wrapper around `@capacitor/local-notifications` (create)
- `src/lib/notifications.test.ts` — tests, plugin mocked (create)
- `src/hooks/useNotificationSync.ts` — combines `useReminders` + `useMedications`, runs sync on mount/foreground (create)
- `src/hooks/useNotificationSync.test.ts` — tests (create)

**UI:**
- `src/components/reminders/RemindersPage.tsx` — Reminders screen (create)
- `src/components/reminders/RemindersPage.test.tsx` — tests (create)
- `src/components/layout/BottomNav.tsx` — add 4th tab (modify)
- `src/App.tsx` — add `/reminders` route, mount `useNotificationSync()` (modify)

---

### Task 1: Reminders table + types

**Files:**
- Create: `supabase/migrations/003_reminders.sql`
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Produces: `Reminder` (`id`, `user_id`, `kind: ReminderKind`, `medication_id: string | null`, `time: string` `'HH:MM'`, `label: string | null`, `enabled: boolean`, `created_at: string`), `ReminderKind = 'daily_log' | 'medication'`, `ReminderInsert = Omit<Reminder, 'id' | 'created_at'>`, `ReminderUpdate = Partial<Pick<Reminder, 'time' | 'label' | 'enabled'>>` — consumed by Task 2 onward.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/003_reminders.sql
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily_log', 'medication')),
  medication_id uuid references medications(id) on delete cascade,
  time time not null,
  label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table reminders enable row level security;
create policy "Users manage own reminders"
  on reminders for all
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration to the local/dev Supabase project**

Run: `supabase db push` (or paste the SQL into the Supabase SQL editor if `supabase db push` isn't configured in this repo — check for a `supabase/config.toml` first with `ls supabase/`).

Expected: no errors; `reminders` table exists with RLS enabled.

- [ ] **Step 3: Add types**

Append to `src/lib/database.types.ts` (after the `MedicationLogUpsert` export, before `FieldType`):

```ts
export type ReminderKind = 'daily_log' | 'medication'

export interface Reminder {
  id: string
  user_id: string
  kind: ReminderKind
  medication_id: string | null
  time: string                   // 'HH:MM'
  label: string | null
  enabled: boolean
  created_at: string
}

export type ReminderInsert = Omit<Reminder, 'id' | 'created_at'>
export type ReminderUpdate = Partial<Pick<Reminder, 'time' | 'label' | 'enabled'>>
```

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: succeeds (this only adds types, no consumers yet).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_reminders.sql src/lib/database.types.ts
git commit -m "feat: add reminders table and types"
```

---

### Task 2: useReminders hook

**Files:**
- Create: `src/hooks/useReminders.ts`
- Create: `src/hooks/useReminders.test.ts`

**Interfaces:**
- Consumes: `Reminder`, `ReminderKind`, `ReminderUpdate` from `src/lib/database.types.ts` (Task 1); `useSupabaseQuery` from `src/hooks/useSupabaseQuery.ts` (existing); `supabase` from `src/lib/supabase.ts` (existing).
- Produces: `useReminders()` returning `{ reminders: Reminder[], loading: boolean, error: string | null, addReminder(data): Promise<string | null>, updateReminder(id, data: ReminderUpdate): Promise<string | null>, deleteReminder(id): Promise<string | null> }` where `addReminder`'s input is `{ kind: ReminderKind, medication_id: string | null, time: string, label: string | null }`. Consumed by Task 5 (`useNotificationSync`) and Task 6 (`RemindersPage`).

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useReminders.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useReminders } from './useReminders'

const reminder1 = {
  id: 'r1', user_id: 'u1', kind: 'daily_log' as const, medication_id: null,
  time: '21:00', label: 'Evening check-in', enabled: true, created_at: '',
}

const mockSingle = vi.fn()
const mockSelectAfterInsert = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelectAfterInsert }))
const mockUpdateSingle = vi.fn()
const mockUpdateEq = vi.fn(() => ({ select: vi.fn(() => ({ single: mockUpdateSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
let deleteEqResponse: { error: { message: string } | null }
const mockDeleteEq = vi.fn(() => Promise.resolve(deleteEqResponse))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockOrder = vi.fn().mockResolvedValue({ data: [reminder1], error: null })
const mockSelectForFetch = vi.fn(() => ({ order: mockOrder }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelectForFetch,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockOrder.mockResolvedValue({ data: [reminder1], error: null })
  deleteEqResponse = { error: null }
})

describe('useReminders', () => {
  it('fetches reminders on mount', async () => {
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reminders).toEqual([reminder1])
  })

  it('returns empty array when no reminders exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.reminders).toEqual([])
  })

  it('addReminder inserts and appends to state', async () => {
    mockSingle.mockResolvedValue({ data: reminder1, error: null })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addReminder({ kind: 'daily_log', medication_id: null, time: '21:00', label: 'Evening check-in' })
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'daily_log', time: '21:00', user_id: 'u1', enabled: true })
    )
  })

  it('updateReminder updates state and returns null on success', async () => {
    const updated = { ...reminder1, enabled: false }
    mockUpdateSingle.mockResolvedValue({ data: updated, error: null })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = 'sentinel'
    await act(async () => {
      returned = await result.current.updateReminder('r1', { enabled: false })
    })

    expect(returned).toBeNull()
    expect(result.current.reminders).toEqual([updated])
  })

  it('updateReminder returns the error and keeps state when the update fails', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update failed' } })
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let returned: string | null = null
    await act(async () => {
      returned = await result.current.updateReminder('r1', { enabled: false })
    })

    expect(returned).toBe('update failed')
    expect(result.current.reminders).toEqual([reminder1])
  })

  it('deleteReminder removes reminder from state', async () => {
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteReminder('r1')
    })

    expect(result.current.reminders).toEqual([])
  })

  it('deleteReminder keeps the reminder and returns the error when delete fails', async () => {
    const { result } = renderHook(() => useReminders())
    await waitFor(() => expect(result.current.loading).toBe(false))

    deleteEqResponse = { error: { message: 'RLS violation' } }
    let returned: string | null = null
    await act(async () => {
      returned = await result.current.deleteReminder('r1')
    })

    expect(returned).toBe('RLS violation')
    expect(result.current.reminders).toEqual([reminder1])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useReminders.test.ts`
Expected: FAIL — `Cannot find module './useReminders'`

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useReminders.ts
import { supabase } from '../lib/supabase'
import type { Reminder, ReminderKind, ReminderUpdate } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

interface NewReminderData {
  kind: ReminderKind
  medication_id: string | null
  time: string
  label: string | null
}

export function useReminders() {
  const { data, loading, error, mutate } = useSupabaseQuery<Reminder[]>(
    'reminders:all',
    () =>
      supabase
        .from('reminders')
        .select('*')
        .order('created_at', { ascending: true })
  )

  const addReminder = async (reminderData: NewReminderData): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert({ ...reminderData, user_id: auth.user.id, enabled: true })
      .select()
      .single()
    if (error) return error.message
    if (inserted) mutate(r => [...(r ?? []), inserted])
    return null
  }

  const updateReminder = async (id: string, reminderData: ReminderUpdate): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('reminders')
      .update(reminderData)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    if (updated) mutate(r => (r ?? []).map(rem => rem.id === id ? updated : rem))
    return null
  }

  const deleteReminder = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (error) return error.message
    mutate(r => (r ?? []).filter(rem => rem.id !== id))
    return null
  }

  return {
    reminders: data ?? [],
    loading,
    error,
    addReminder,
    updateReminder,
    deleteReminder,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useReminders.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useReminders.ts src/hooks/useReminders.test.ts
git commit -m "feat: add useReminders hook"
```

---

### Task 3: Install Capacitor and scaffold iOS/Android projects

**Files:**
- Modify: `package.json`
- Create: `capacitor.config.ts`
- Create: `ios/` (generated)
- Create: `android/` (generated)

**Interfaces:**
- Produces: installed `@capacitor/core`, `@capacitor/local-notifications`, `@capacitor/app` packages (importable from Task 4/5); `ios/` and `android/` native projects that Task 4 onward run against.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @capacitor/core @capacitor/ios @capacitor/android @capacitor/local-notifications @capacitor/app
npm install -D @capacitor/cli
```
Expected: `package.json` `dependencies`/`devDependencies` gain these five packages (no version pinning beyond what npm resolves — this repo doesn't pin exact patch versions elsewhere either).

- [ ] **Step 2: Write capacitor.config.ts**

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.moodtracker.plus',
  appName: 'Mood Tracker+',
  webDir: 'dist',
}

export default config
```

- [ ] **Step 3: Build the web app, then add native platforms**

Run:
```bash
npm run build
npx cap add ios
npx cap add android
```
Expected: `ios/` and `android/` directories are created at the repo root, each with a native project referencing `com.moodtracker.plus`.

- [ ] **Step 4: Verify the Android manifest declares the notification permission**

Android 13+ (API 33+) requires `POST_NOTIFICATIONS` to be declared. `@capacitor/local-notifications` merges this in automatically, but confirm it:

Run: `grep -n "POST_NOTIFICATIONS" android/app/src/main/AndroidManifest.xml`

Expected: one match, e.g. `<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`.

If there's no match, add this line inside the `<manifest>` element of `android/app/src/main/AndroidManifest.xml`, alongside the other `<uses-permission>` entries:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

- [ ] **Step 5: Add sync/open scripts to package.json**

Add to the `"scripts"` section of `package.json` (after `"preview"`):

```json
"cap:sync": "npm run build && npx cap sync",
"cap:ios": "npx cap open ios",
"cap:android": "npx cap open android"
```

- [ ] **Step 6: Sync the build into both native projects**

Run: `npm run cap:sync`
Expected: succeeds, prints `√ Sync finished` (or equivalent) for both `ios` and `android`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json capacitor.config.ts ios android
git commit -m "feat: scaffold Capacitor iOS and Android projects"
```

---

### Task 4: Notification reconciliation module

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `src/lib/notifications.test.ts`

**Interfaces:**
- Consumes: `@capacitor/core` (`Capacitor.isNativePlatform()`), `@capacitor/local-notifications` (`LocalNotifications.getPending()`, `.cancel()`, `.schedule()`, `.requestPermissions()`) — installed in Task 3.
- Produces: `isNativePlatform(): boolean`, `requestNotificationPermission(): Promise<boolean>`, `syncScheduledNotifications(reminders: ScheduledReminder[]): Promise<void>`, and the `ScheduledReminder` type (`{ id: string, time: string, title: string, body: string }`). Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetPending = vi.fn()
const mockCancel = vi.fn()
const mockSchedule = vi.fn()
const mockRequestPermissions = vi.fn()

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    getPending: (...args: unknown[]) => mockGetPending(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    schedule: (...args: unknown[]) => mockSchedule(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}))

import { syncScheduledNotifications, requestNotificationPermission, isNativePlatform } from './notifications'
import { Capacitor } from '@capacitor/core'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetPending.mockResolvedValue({ notifications: [] })
  mockCancel.mockResolvedValue(undefined)
  mockSchedule.mockResolvedValue(undefined)
})

describe('isNativePlatform', () => {
  it('delegates to Capacitor.isNativePlatform', () => {
    expect(isNativePlatform()).toBe(true)
    expect(Capacitor.isNativePlatform).toHaveBeenCalled()
  })
})

describe('requestNotificationPermission', () => {
  it('returns true when permission is granted', async () => {
    mockRequestPermissions.mockResolvedValue({ display: 'granted' })
    await expect(requestNotificationPermission()).resolves.toBe(true)
  })

  it('returns false when permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ display: 'denied' })
    await expect(requestNotificationPermission()).resolves.toBe(false)
  })
})

describe('syncScheduledNotifications', () => {
  it('cancels existing pending notifications before scheduling', async () => {
    mockGetPending.mockResolvedValue({ notifications: [{ id: 1 }, { id: 2 }] })

    await syncScheduledNotifications([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ])

    expect(mockCancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }, { id: 2 }] })
  })

  it('skips cancel when there is nothing pending', async () => {
    mockGetPending.mockResolvedValue({ notifications: [] })
    await syncScheduledNotifications([])
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('schedules one notification per reminder with hour/minute parsed from time', async () => {
    await syncScheduledNotifications([
      { id: 'r1', time: '21:05', title: 'Evening check-in', body: "Time to log today's mood" },
      { id: 'r2', time: '08:00', title: 'Medication reminder', body: 'Time to take Lithium' },
    ])

    expect(mockSchedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 1,
          title: 'Evening check-in',
          body: "Time to log today's mood",
          schedule: { on: { hour: 21, minute: 5 }, allowWhileIdle: true },
        },
        {
          id: 2,
          title: 'Medication reminder',
          body: 'Time to take Lithium',
          schedule: { on: { hour: 8, minute: 0 }, allowWhileIdle: true },
        },
      ],
    })
  })

  it('does not call schedule when there are no reminders', async () => {
    await syncScheduledNotifications([])
    expect(mockSchedule).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL — `Cannot find module './notifications'`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/notifications.ts
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export interface ScheduledReminder {
  id: string
  time: string    // 'HH:MM'
  title: string
  body: string
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

export async function syncScheduledNotifications(reminders: ScheduledReminder[]): Promise<void> {
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications })
  }

  if (reminders.length === 0) return

  await LocalNotifications.schedule({
    notifications: reminders.map((reminder, index) => {
      const [hour, minute] = reminder.time.split(':').map(Number)
      return {
        id: index + 1,
        title: reminder.title,
        body: reminder.body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      }
    }),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat: add native notification reconciliation module"
```

---

### Task 5: useNotificationSync hook

**Files:**
- Create: `src/hooks/useNotificationSync.ts`
- Create: `src/hooks/useNotificationSync.test.ts`

**Interfaces:**
- Consumes: `useReminders` (Task 2), `useMedications` (existing, `src/hooks/useMedications.ts`), `isNativePlatform`/`syncScheduledNotifications`/`ScheduledReminder` from `src/lib/notifications.ts` (Task 4), `@capacitor/app`'s `App.addListener('appStateChange', ...)`.
- Produces: `buildScheduledReminders(reminders: Reminder[], medications: Medication[]): ScheduledReminder[]` (exported for direct testing) and `useNotificationSync(): void`, called once at the app root in Task 7.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useNotificationSync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { Reminder, Medication } from '../lib/database.types'

const mockAddListener = vi.fn(() => ({ remove: vi.fn() }))
vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => mockAddListener(...args) },
}))

const mockIsNativePlatform = vi.fn(() => true)
const mockSync = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
  syncScheduledNotifications: (...args: unknown[]) => mockSync(...args),
}))

const dailyReminder: Reminder = {
  id: 'r1', user_id: 'u1', kind: 'daily_log', medication_id: null,
  time: '21:00', label: 'Evening check-in', enabled: true, created_at: '',
}
const disabledReminder: Reminder = { ...dailyReminder, id: 'r2', enabled: false }
const medReminder: Reminder = {
  id: 'r3', user_id: 'u1', kind: 'medication', medication_id: 'm1',
  time: '08:00', label: null, enabled: true, created_at: '',
}
const med: Medication = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}

let remindersState: Reminder[]
let medicationsState: Medication[]
vi.mock('./useReminders', () => ({
  useReminders: () => ({ reminders: remindersState }),
}))
vi.mock('./useMedications', () => ({
  useMedications: () => ({ medications: medicationsState }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
  remindersState = [dailyReminder]
  medicationsState = []
})

describe('buildScheduledReminders', () => {
  it('builds a daily_log reminder with its label as the title', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([dailyReminder], [])
    expect(result).toEqual([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ])
  })

  it('falls back to a default title when a daily_log reminder has no label', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([{ ...dailyReminder, label: null }], [])
    expect(result[0].title).toBe('Daily check-in')
  })

  it('builds a medication reminder naming the matched medication', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([medReminder], [med])
    expect(result).toEqual([
      { id: 'r3', time: '08:00', title: 'Medication reminder', body: 'Time to take Lithium' },
    ])
  })

  it('excludes disabled reminders', async () => {
    const { buildScheduledReminders } = await import('./useNotificationSync')
    const result = buildScheduledReminders([dailyReminder, disabledReminder], [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('r1')
  })
})

describe('useNotificationSync', () => {
  it('syncs scheduled notifications on mount when native', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockSync).toHaveBeenCalledWith([
      { id: 'r1', time: '21:00', title: 'Evening check-in', body: "Time to log today's mood" },
    ])
  })

  it('does not sync when not on a native platform', async () => {
    mockIsNativePlatform.mockReturnValue(false)
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('registers an appStateChange listener when native', async () => {
    const { useNotificationSync } = await import('./useNotificationSync')
    renderHook(() => useNotificationSync())
    expect(mockAddListener).toHaveBeenCalledWith('appStateChange', expect.any(Function))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useNotificationSync.test.ts`
Expected: FAIL — `Cannot find module './useNotificationSync'`

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useNotificationSync.ts
import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { Reminder, Medication } from '../lib/database.types'
import { isNativePlatform, syncScheduledNotifications, type ScheduledReminder } from '../lib/notifications'
import { useReminders } from './useReminders'
import { useMedications } from './useMedications'

export function buildScheduledReminders(reminders: Reminder[], medications: Medication[]): ScheduledReminder[] {
  return reminders
    .filter(reminder => reminder.enabled)
    .map(reminder => {
      if (reminder.kind === 'medication') {
        const medication = medications.find(m => m.id === reminder.medication_id)
        return {
          id: reminder.id,
          time: reminder.time,
          title: 'Medication reminder',
          body: medication ? `Time to take ${medication.name}` : 'Time to take your medication',
        }
      }
      return {
        id: reminder.id,
        time: reminder.time,
        title: reminder.label || 'Daily check-in',
        body: "Time to log today's mood",
      }
    })
}

export function useNotificationSync(): void {
  const { reminders } = useReminders()
  const { medications } = useMedications()

  useEffect(() => {
    if (!isNativePlatform()) return
    void syncScheduledNotifications(buildScheduledReminders(reminders, medications))
  }, [reminders, medications])

  useEffect(() => {
    if (!isNativePlatform()) return
    const listenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      void syncScheduledNotifications(buildScheduledReminders(reminders, medications))
    })
    return () => { void listenerPromise.remove() }
  }, [reminders, medications])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useNotificationSync.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotificationSync.ts src/hooks/useNotificationSync.test.ts
git commit -m "feat: add useNotificationSync hook"
```

---

### Task 6: Reminders screen UI

**Files:**
- Create: `src/components/reminders/RemindersPage.tsx`
- Create: `src/components/reminders/RemindersPage.test.tsx`

**Interfaces:**
- Consumes: `useReminders` (Task 2), `useMedications` (existing), `isNativePlatform`/`requestNotificationPermission` from `src/lib/notifications.ts` (Task 4), `formatTime` from `src/lib/dates.ts` (existing), `focusRing` from `src/lib/styles.ts` (existing).
- Produces: `RemindersPage` React component, mounted at `/reminders` in Task 7.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/reminders/RemindersPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RemindersPage } from './RemindersPage'
import type { Reminder, Medication } from '../../lib/database.types'

const dailyReminder: Reminder = {
  id: 'r1', user_id: 'u1', kind: 'daily_log', medication_id: null,
  time: '21:00', label: 'Evening check-in', enabled: true, created_at: '',
}
const med: Medication = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}
const medReminder: Reminder = {
  id: 'r2', user_id: 'u1', kind: 'medication', medication_id: 'm1',
  time: '08:00', label: null, enabled: true, created_at: '',
}

const mockAddReminder = vi.fn().mockResolvedValue(null)
const mockUpdateReminder = vi.fn().mockResolvedValue(null)
const mockDeleteReminder = vi.fn().mockResolvedValue(null)
let remindersState: Reminder[]

vi.mock('../../hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: remindersState,
    addReminder: mockAddReminder,
    updateReminder: mockUpdateReminder,
    deleteReminder: mockDeleteReminder,
  }),
}))
vi.mock('../../hooks/useMedications', () => ({
  useMedications: () => ({ medications: [med] }),
}))

const mockIsNativePlatform = vi.fn(() => true)
const mockRequestPermission = vi.fn().mockResolvedValue(true)
vi.mock('../../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
  requestNotificationPermission: () => mockRequestPermission(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
  mockRequestPermission.mockResolvedValue(true)
  remindersState = [dailyReminder]
})

describe('RemindersPage', () => {
  it('lists existing daily log reminders', () => {
    render(<RemindersPage />)
    expect(screen.getByDisplayValue('Evening check-in')).toBeInTheDocument()
  })

  it('lists every active medication with a reminder row', () => {
    render(<RemindersPage />)
    expect(screen.getByText('Lithium')).toBeInTheDocument()
  })

  it('adds a daily log reminder when the add form is submitted', async () => {
    render(<RemindersPage />)
    fireEvent.change(screen.getByLabelText('New reminder time'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('New reminder label'), { target: { value: 'Morning check-in' } })
    fireEvent.click(screen.getByText('Add reminder'))

    await waitFor(() => expect(mockAddReminder).toHaveBeenCalledWith({
      kind: 'daily_log', medication_id: null, time: '09:00', label: 'Morning check-in',
    }))
  })

  it('deletes a daily log reminder', async () => {
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Delete Evening check-in reminder'))
    await waitFor(() => expect(mockDeleteReminder).toHaveBeenCalledWith('r1'))
  })

  it('creates a medication reminder pre-filled from scheduled_time when its toggle is turned on', async () => {
    remindersState = []
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Remind me for Lithium'))

    await waitFor(() => expect(mockAddReminder).toHaveBeenCalledWith({
      kind: 'medication', medication_id: 'm1', time: '08:00', label: null,
    }))
  })

  it('toggles an existing medication reminder off', async () => {
    remindersState = [medReminder]
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Remind me for Lithium'))
    await waitFor(() => expect(mockUpdateReminder).toHaveBeenCalledWith('r2', { enabled: false }))
  })

  it('requests notification permission before enabling a reminder, and does not add it if denied', async () => {
    remindersState = []
    mockRequestPermission.mockResolvedValue(false)
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Remind me for Lithium'))

    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalled())
    expect(mockAddReminder).not.toHaveBeenCalled()
  })

  it('disables notification toggles on web (non-native)', () => {
    mockIsNativePlatform.mockReturnValue(false)
    render(<RemindersPage />)
    expect(screen.getByLabelText('Remind me for Lithium')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/reminders/RemindersPage.test.tsx`
Expected: FAIL — `Cannot find module './RemindersPage'`

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/reminders/RemindersPage.tsx
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useReminders } from '../../hooks/useReminders'
import { useMedications } from '../../hooks/useMedications'
import { isNativePlatform, requestNotificationPermission } from '../../lib/notifications'
import { focusRing } from '../../lib/styles'

export function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders()
  const { medications } = useMedications()
  const [newTime, setNewTime] = useState('21:00')
  const [newLabel, setNewLabel] = useState('')
  const native = isNativePlatform()

  const dailyReminders = reminders.filter(r => r.kind === 'daily_log')

  const enableReminder = async (existing: typeof reminders[number] | undefined, time: string, medicationId: string | null) => {
    const granted = await requestNotificationPermission()
    if (!granted) return
    if (existing) {
      await updateReminder(existing.id, { enabled: true })
    } else {
      await addReminder({ kind: medicationId ? 'medication' : 'daily_log', medication_id: medicationId, time, label: null })
    }
  }

  const disableReminder = async (id: string) => {
    await updateReminder(id, { enabled: false })
  }

  const handleAddDailyReminder = async () => {
    if (!newTime) return
    const granted = await requestNotificationPermission()
    if (!granted) return
    await addReminder({ kind: 'daily_log', medication_id: null, time: newTime, label: newLabel || null })
    setNewLabel('')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reminders</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Daily check-ins</h2>
        {dailyReminders.map(reminder => (
          <div key={reminder.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="time"
              aria-label={`${reminder.label ?? 'Daily reminder'} time`}
              value={reminder.time}
              onChange={e => void updateReminder(reminder.id, { time: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              aria-label={`${reminder.label ?? 'Daily reminder'} label`}
              value={reminder.label ?? ''}
              placeholder="Label"
              onChange={e => void updateReminder(reminder.id, { label: e.target.value || null })}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                aria-label={reminder.enabled ? `Disable ${reminder.label ?? 'reminder'}` : `Enable ${reminder.label ?? 'reminder'}`}
                checked={reminder.enabled}
                disabled={!native}
                onChange={e => void (e.target.checked ? enableReminder(reminder, reminder.time, null) : disableReminder(reminder.id))}
                className="w-5 h-5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>
            <button
              type="button"
              aria-label={`Delete ${reminder.label ?? 'reminder'} reminder`}
              onClick={() => void deleteReminder(reminder.id)}
              className={`p-2 -m-1 text-red-500 dark:text-red-400 rounded-lg ${focusRing}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <input
            type="time"
            aria-label="New reminder time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            aria-label="New reminder label"
            value={newLabel}
            placeholder="Label (optional)"
            onChange={e => setNewLabel(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={() => void handleAddDailyReminder()}
            className={`bg-blue-600 text-white rounded p-2 text-sm font-medium ${focusRing}`}
          >
            Add reminder
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Medications</h2>
        {medications.map(med => {
          const existing = reminders.find(r => r.kind === 'medication' && r.medication_id === med.id)
          const time = existing?.time ?? med.scheduled_time ?? '08:00'
          return (
            <div key={med.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{med.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{med.dose}</p>
              </div>
              <input
                type="time"
                aria-label={`${med.name} reminder time`}
                value={time}
                disabled={!existing}
                onChange={e => existing && void updateReminder(existing.id, { time: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={`Remind me for ${med.name}`}
                  checked={existing?.enabled ?? false}
                  disabled={!native}
                  onChange={e => void (e.target.checked ? enableReminder(existing, time, med.id) : existing && disableReminder(existing.id))}
                  className="w-5 h-5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                />
              </label>
            </div>
          )
        })}
      </section>

      {!native && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Notification scheduling is only available in the iOS/Android app.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/reminders/RemindersPage.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/reminders/RemindersPage.tsx src/components/reminders/RemindersPage.test.tsx
git commit -m "feat: add Reminders screen"
```

---

### Task 7: Wire routing, nav tab, and app-level notification sync

**Files:**
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `RemindersPage` (Task 6), `useNotificationSync` (Task 5).

- [ ] **Step 1: Add the Reminders tab to BottomNav**

In `src/components/layout/BottomNav.tsx`, change the import and `tabs` array:

```tsx
import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardList, LineChart, Bell } from 'lucide-react'
import { focusRing } from '../../lib/styles'

const tabs = [
  { to: '/', label: 'Today', Icon: CalendarDays },
  { to: '/history', label: 'History', Icon: ClipboardList },
  { to: '/charts', label: 'Charts', Icon: LineChart },
  { to: '/reminders', label: 'Reminders', Icon: Bell },
]
```

(The rest of the file — the `BottomNav` component body — is unchanged.)

- [ ] **Step 2: Add the route and mount notification sync in App.tsx**

In `src/App.tsx`, add the import and route, and call `useNotificationSync()`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './hooks/useAuth'
import { useNotificationSync } from './hooks/useNotificationSync'
import { AuthPage } from './components/auth/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TodayPage } from './components/today/TodayPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ChartsPage } from './components/charts/ChartsPage'
import { RemindersPage } from './components/reminders/RemindersPage'

export function App() {
  const { session, loading, isPasswordRecovery, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        Loading…
      </div>
    )
  }

  if (!session || isPasswordRecovery) {
    return <AuthPage initialMode={isPasswordRecovery ? 'reset-password' : 'sign-in'} />
  }

  return <AuthenticatedApp signOut={signOut} />
}

function AuthenticatedApp({ signOut }: { signOut: () => void }) {
  useNotificationSync()

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell signOut={signOut}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/log/:date" element={<TodayPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <Analytics />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
```

`useNotificationSync` is split into its own `AuthenticatedApp` component (rather than called directly in `App`) so it only runs once a `session` exists — it's a hook and can't be called conditionally inside `App` itself.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new hook/component tests from Tasks 2, 4, 5, 6.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run cap:sync && npm run cap:ios`
Expected: Xcode opens with the synced project; running on a simulator/device shows the four-tab nav (Today/History/Charts/Reminders) and the Reminders screen renders without crashing.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/App.tsx
git commit -m "feat: wire Reminders screen and notification sync into the app"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), reconciliation/cancel-rebuild logic (Task 4), permission request on first enable (Task 6), tap-to-open-Today (native default behavior — Capacitor opens the app on tap without extra code, so no dedicated task needed beyond `useNotificationSync` scheduling), UI for both reminder kinds (Task 6), web toggle disabled when non-native (Task 6, tested), Capacitor scaffold/bundled loading (Task 3), build/tooling scripts (Task 3). Distribution and push notifications are explicitly out of scope per the spec and are not tasked.
- **Type consistency:** `Reminder`/`ReminderUpdate` (Task 1) match the fields used in `useReminders` (Task 2), `buildScheduledReminders` (Task 5), and `RemindersPage` (Task 6). `ScheduledReminder` (Task 4) matches the shape produced by `buildScheduledReminders` (Task 5) and consumed by `syncScheduledNotifications` (Task 4).
