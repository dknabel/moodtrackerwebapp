# Bipolar Mood Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA for daily mood, food, exercise, and sleep tracking with Supabase backend and trend charts.

**Architecture:** Vite + React + TypeScript frontend deployed as a PWA on Vercel; Supabase provides PostgreSQL storage, magic link auth, and row-level security. Bottom tab navigation between Today (daily log), History (past entries), and Charts (trend views).

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Supabase JS v2, React Router v6, Recharts, date-fns, Vitest, React Testing Library, vite-plugin-pwa

---

## File Map

```
src/
  main.tsx                          # Entry point
  App.tsx                           # Router + auth guard
  index.css                         # Tailwind import
  test-setup.ts                     # jest-dom + ResizeObserver mock
  lib/
    supabase.ts                     # Supabase client singleton
    database.types.ts               # TypeScript types for daily_logs
    sleep.ts                        # calculateSleepHours utility
    sleep.test.ts
  hooks/
    useAuth.ts                      # Session state + signOut
    useDailyLog.ts                  # Fetch + save one day's log
    useDailyLog.test.ts
    useLogs.ts                      # Fetch logs over a date range
    useLogs.test.ts
  components/
    auth/
      LoginPage.tsx                 # Magic link email form
      LoginPage.test.tsx
    layout/
      AppShell.tsx                  # Padding + bottom nav wrapper
      BottomNav.tsx                 # Fixed bottom tab bar
    ui/
      Slider.tsx                    # Reusable labeled range input
    today/
      TodayPage.tsx                 # Form container; reads :date param or today
      MoodSection.tsx               # Three sliders: mood, energy, anxiety
      MoodSection.test.tsx
      FoodSection.tsx               # Meals count stepper
      FoodSection.test.tsx
      ExerciseSection.tsx           # Did/didn't toggle
      ExerciseSection.test.tsx
      SleepSection.tsx              # Bedtime, wake time, hours, quality
      SleepSection.test.tsx
    history/
      HistoryPage.tsx               # Scrollable list of past entries
      HistoryEntry.tsx              # Single row summary
    charts/
      ChartsPage.tsx                # Time range selector + chart grid
      MoodChart.tsx                 # LineChart: mood/energy/anxiety
      SleepChart.tsx                # LineChart: hours + quality
      MealsChart.tsx                # BarChart: meals per day
      ExerciseChart.tsx             # BarChart: exercised (1) or not (0) per day
vite.config.ts
.env.example
public/
  icon-192.png                      # PWA icon (add manually or generate)
  icon-512.png
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `vite.config.ts`
- Create: `src/test-setup.ts`
- Create: `src/index.css`
- Create: `.env.example`

- [ ] **Step 1: Initialize Vite project**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about existing files, select "Ignore files and continue".

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @supabase/supabase-js react-router-dom recharts date-fns
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vite-plugin-pwa
```

- [ ] **Step 4: Replace `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mood Tracker',
        short_name: 'Mood',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 5: Create `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
```

- [ ] **Step 6: Replace `src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 8: Verify the dev server starts**

```bash
cp .env.example .env.local
npm run dev
```

Expected: Vite dev server starts at http://localhost:5173 (will show default Vite page — that's fine).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold vite+react+ts project with tailwind and vitest"
```

---

## Task 2: Supabase Setup

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/database.types.ts`

- [ ] **Step 1: Create a Supabase project**

Go to https://supabase.com, create a new project. Once provisioned, go to **Settings → API** and copy:
- Project URL → `VITE_SUPABASE_URL` in `.env.local`
- `anon` public key → `VITE_SUPABASE_ANON_KEY` in `.env.local`

- [ ] **Step 2: Run the database migration**

In the Supabase dashboard, go to **SQL Editor** and run:

```sql
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  mood_rating int check (mood_rating between 1 and 10),
  mood_energy int check (mood_energy between 1 and 10),
  mood_anxiety int check (mood_anxiety between 1 and 10),
  meals_count int check (meals_count >= 0),
  exercised boolean default false,
  sleep_hours decimal(4,2) check (sleep_hours >= 0 and sleep_hours <= 24),
  sleep_quality int check (sleep_quality between 1 and 5),
  bedtime time,
  wake_time time,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

alter table daily_logs enable row level security;

create policy "Users can only access their own logs"
  on daily_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger daily_logs_updated_at
  before update on daily_logs
  for each row execute function update_updated_at();
```

- [ ] **Step 3: Enable magic link auth in Supabase**

In the Supabase dashboard, go to **Authentication → Providers → Email** and ensure "Enable Email provider" is on and "Confirm email" is on. Magic links are sent automatically when you call `signInWithOtp`.

- [ ] **Step 4: Create `src/lib/database.types.ts`**

```typescript
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
  bedtime: string | null  // 'HH:MM'
  wake_time: string | null
  created_at: string
  updated_at: string
}

export type DailyLogInsert = Omit<DailyLog, 'id' | 'created_at' | 'updated_at'>
export type DailyLogUpdate = Partial<Omit<DailyLogInsert, 'user_id' | 'date'>>
```

- [ ] **Step 5: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/
git commit -m "feat: add supabase client, database types, and schema migration"
```

---

## Task 3: Sleep Hours Utility

**Files:**
- Create: `src/lib/sleep.ts`
- Create: `src/lib/sleep.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sleep.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateSleepHours } from './sleep'

describe('calculateSleepHours', () => {
  it('calculates hours within the same day', () => {
    expect(calculateSleepHours('22:00', '06:00')).toBe(8)
  })

  it('calculates hours crossing midnight', () => {
    expect(calculateSleepHours('23:30', '07:00')).toBe(7.5)
  })

  it('handles fractional hours', () => {
    expect(calculateSleepHours('23:00', '06:20')).toBe(7.3)
  })

  it('returns 0 when bedtime equals wake time', () => {
    expect(calculateSleepHours('08:00', '08:00')).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/sleep.test.ts
```

Expected: FAIL — "Cannot find module './sleep'"

- [ ] **Step 3: Implement `src/lib/sleep.ts`**

```typescript
export function calculateSleepHours(bedtime: string, wakeTime: string): number {
  const [bedH, bedM] = bedtime.split(':').map(Number)
  const [wakeH, wakeM] = wakeTime.split(':').map(Number)

  let bedMinutes = bedH * 60 + bedM
  let wakeMinutes = wakeH * 60 + wakeM

  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60
  }

  const hours = (wakeMinutes - bedMinutes) / 60
  return Math.round(hours * 10) / 10
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/sleep.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/sleep.ts src/lib/sleep.test.ts
git commit -m "feat: add sleep hours calculation utility"
```

---

## Task 4: Auth Hook + Login Page

**Files:**
- Create: `src/hooks/useAuth.ts`
- Create: `src/components/auth/LoginPage.tsx`
- Create: `src/components/auth/LoginPage.test.tsx`

- [ ] **Step 1: Write the failing LoginPage test**

Create `src/components/auth/LoginPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('shows confirmation message after sending magic link', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as any)

    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows error message when sending fails', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: {},
      error: { message: 'Rate limit exceeded' },
    } as any)

    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send link/i }))

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/auth/LoginPage.test.tsx
```

Expected: FAIL — "Cannot find module './LoginPage'"

- [ ] **Step 3: Create `src/hooks/useAuth.ts`**

```typescript
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signOut }
}
```

- [ ] **Step 4: Create `src/components/auth/LoginPage.tsx`**

```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-center text-lg text-gray-700">
          Check your email for a login link.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-4"
    >
      <h1 className="text-2xl font-bold text-gray-900">Mood Tracker</h1>
      <p className="text-gray-500 text-sm">Enter your email to sign in</p>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-full max-w-sm border border-gray-300 rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full max-w-sm bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send link'}
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/components/auth/LoginPage.test.tsx
```

Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useAuth.ts src/components/auth/
git commit -m "feat: add magic link login page and auth hook"
```

---

## Task 5: App Shell + Routing

**Files:**
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/App.tsx` (replace)
- Create: `src/main.tsx` (replace)

- [ ] **Step 1: Create `src/components/layout/BottomNav.tsx`**

```typescript
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Today', icon: '📅' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/charts', label: 'Charts', icon: '📈' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-area-pb">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/AppShell.tsx`**

```typescript
import { BottomNav } from './BottomNav'
import { useAuth } from '../../hooks/useAuth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="max-w-lg mx-auto px-4 pt-4 flex justify-end">
        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/App.tsx`**

The three page components (TodayPage, HistoryPage, ChartsPage) don't exist yet — create them as stubs so routing works now.

Create `src/components/today/TodayPage.tsx`:
```typescript
export function TodayPage() {
  return <div className="text-center text-gray-400 mt-12">Today — coming soon</div>
}
```

Create `src/components/history/HistoryPage.tsx`:
```typescript
export function HistoryPage() {
  return <div className="text-center text-gray-400 mt-12">History — coming soon</div>
}
```

Create `src/components/charts/ChartsPage.tsx`:
```typescript
export function ChartsPage() {
  return <div className="text-center text-gray-400 mt-12">Charts — coming soon</div>
}
```

Now replace `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './components/auth/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { TodayPage } from './components/today/TodayPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ChartsPage } from './components/charts/ChartsPage'

export function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/log/:date" element={<TodayPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Replace `src/main.tsx`**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Delete the default Vite boilerplate**

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 6: Verify app loads**

```bash
npm run dev
```

Open http://localhost:5173 — you should see the login page (email input + "Send link" button).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add app shell, bottom nav, and routing with stub pages"
```

---

## Task 6: `useDailyLog` Hook

**Files:**
- Create: `src/hooks/useDailyLog.ts`
- Create: `src/hooks/useDailyLog.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useDailyLog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDailyLog } from './useDailyLog'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) }))
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })) }))
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('useDailyLog', () => {
  it('fetches the log for the given date', async () => {
    const mockLog = { id: '1', date: '2026-06-20', mood_rating: 7 }
    mockMaybeSingle.mockResolvedValue({ data: mockLog, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.log).toEqual(mockLog)
  })

  it('returns null log when no entry exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.log).toBeNull()
  })

  it('inserts a new log when none exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const newLog = { id: '2', date: '2026-06-20', mood_rating: 8 }
    mockSingle.mockResolvedValue({ data: newLog, error: null })

    const { result } = renderHook(() => useDailyLog('2026-06-20'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.save({ mood_rating: 8, mood_energy: null, mood_anxiety: null,
        meals_count: null, exercised: null, sleep_hours: null, sleep_quality: null,
        bedtime: null, wake_time: null })
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ mood_rating: 8, user_id: 'user-123', date: '2026-06-20' })
    )
    expect(result.current.log).toEqual(newLog)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useDailyLog.test.ts
```

Expected: FAIL — "Cannot find module './useDailyLog'"

- [ ] **Step 3: Create `src/hooks/useDailyLog.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogUpdate } from '../lib/database.types'

export function useDailyLog(date: string) {
  const [log, setLog] = useState<DailyLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .from('daily_logs')
      .select('*')
      .eq('date', date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setLog(data)
        setLoading(false)
      })
  }, [date])

  const save = async (values: DailyLogUpdate) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const record = { ...values, user_id: user.id, date }

    if (log) {
      const { data, error } = await supabase
        .from('daily_logs')
        .update(record)
        .eq('id', log.id)
        .select()
        .single()
      if (error) return { error: error.message }
      setLog(data)
      return { error: null }
    } else {
      const { data, error } = await supabase
        .from('daily_logs')
        .insert(record)
        .select()
        .single()
      if (error) return { error: error.message }
      setLog(data)
      return { error: null }
    }
  }

  return { log, loading, error, save }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useDailyLog.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDailyLog.ts src/hooks/useDailyLog.test.ts
git commit -m "feat: add useDailyLog hook with fetch and upsert"
```

---

## Task 7: Today Page

**Files:**
- Create: `src/components/ui/Slider.tsx`
- Replace: `src/components/today/TodayPage.tsx`
- Create: `src/components/today/MoodSection.tsx`
- Create: `src/components/today/MoodSection.test.tsx`
- Create: `src/components/today/FoodSection.tsx`
- Create: `src/components/today/FoodSection.test.tsx`
- Create: `src/components/today/ExerciseSection.tsx`
- Create: `src/components/today/ExerciseSection.test.tsx`
- Create: `src/components/today/SleepSection.tsx`
- Create: `src/components/today/SleepSection.test.tsx`

### Slider UI Component

- [ ] **Step 1: Create `src/components/ui/Slider.tsx`**

```typescript
interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export function Slider({ label, value, min = 1, max = 10, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-blue-600">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-600 h-2 cursor-pointer"
      />
    </div>
  )
}
```

### MoodSection

- [ ] **Step 2: Write the failing MoodSection test**

Create `src/components/today/MoodSection.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoodSection } from './MoodSection'

const defaults = { mood_rating: 5, mood_energy: 5, mood_anxiety: 5 }

describe('MoodSection', () => {
  it('renders all three sliders', () => {
    render(<MoodSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Energy')).toBeInTheDocument()
    expect(screen.getByText('Anxiety')).toBeInTheDocument()
  })

  it('calls onChange with updated mood_rating', async () => {
    const onChange = vi.fn()
    render(<MoodSection values={defaults} onChange={onChange} />)
    const sliders = screen.getAllByRole('slider')
    await userEvent.type(sliders[0], '{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mood_rating: 6 }))
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/components/today/MoodSection.test.tsx
```

Expected: FAIL — "Cannot find module './MoodSection'"

- [ ] **Step 4: Create `src/components/today/MoodSection.tsx`**

```typescript
import { Slider } from '../ui/Slider'

interface MoodValues {
  mood_rating: number
  mood_energy: number
  mood_anxiety: number
}

interface MoodSectionProps {
  values: MoodValues
  onChange: (values: MoodValues) => void
}

export function MoodSection({ values, onChange }: MoodSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Mood</h2>
      <Slider
        label="Mood"
        value={values.mood_rating}
        onChange={v => onChange({ ...values, mood_rating: v })}
      />
      <Slider
        label="Energy"
        value={values.mood_energy}
        onChange={v => onChange({ ...values, mood_energy: v })}
      />
      <Slider
        label="Anxiety"
        value={values.mood_anxiety}
        onChange={v => onChange({ ...values, mood_anxiety: v })}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/components/today/MoodSection.test.tsx
```

Expected: PASS — 2 tests

### FoodSection

- [ ] **Step 6: Write the failing FoodSection test**

Create `src/components/today/FoodSection.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodSection } from './FoodSection'

describe('FoodSection', () => {
  it('renders the meals count', () => {
    render(<FoodSection value={3} onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('increments meals count', async () => {
    const onChange = vi.fn()
    render(<FoodSection value={2} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /\+/i }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('decrements meals count and does not go below 0', async () => {
    const onChange = vi.fn()
    render(<FoodSection value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /−/i }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

```bash
npx vitest run src/components/today/FoodSection.test.tsx
```

Expected: FAIL — "Cannot find module './FoodSection'"

- [ ] **Step 8: Create `src/components/today/FoodSection.tsx`**

```typescript
interface FoodSectionProps {
  value: number
  onChange: (value: number) => void
}

export function FoodSection({ value, onChange }: FoodSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">Food</h2>
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-600">Meals today</span>
        <div className="flex items-center gap-4 ml-auto">
          <button
            type="button"
            onClick={() => value > 0 && onChange(value - 1)}
            aria-label="−"
            className="w-9 h-9 rounded-full border border-gray-300 text-lg font-medium text-gray-700 disabled:opacity-40"
            disabled={value === 0}
          >
            −
          </button>
          <span className="text-xl font-semibold w-6 text-center">{value}</span>
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            aria-label="+"
            className="w-9 h-9 rounded-full border border-gray-300 text-lg font-medium text-gray-700"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Run test to verify it passes**

```bash
npx vitest run src/components/today/FoodSection.test.tsx
```

Expected: PASS — 3 tests

### ExerciseSection

- [ ] **Step 10: Write the failing ExerciseSection test**

Create `src/components/today/ExerciseSection.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseSection } from './ExerciseSection'

describe('ExerciseSection', () => {
  it('shows unchecked state', () => {
    render(<ExerciseSection value={false} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('calls onChange when toggled', async () => {
    const onChange = vi.fn()
    render(<ExerciseSection value={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
```

- [ ] **Step 11: Run test to verify it fails**

```bash
npx vitest run src/components/today/ExerciseSection.test.tsx
```

Expected: FAIL — "Cannot find module './ExerciseSection'"

- [ ] **Step 12: Create `src/components/today/ExerciseSection.tsx`**

```typescript
interface ExerciseSectionProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function ExerciseSection({ value, onChange }: ExerciseSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">Exercise</h2>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
          className="w-5 h-5 accent-blue-600 cursor-pointer"
        />
        <span className="text-sm text-gray-700">Exercised today</span>
      </label>
    </div>
  )
}
```

- [ ] **Step 13: Run test to verify it passes**

```bash
npx vitest run src/components/today/ExerciseSection.test.tsx
```

Expected: PASS — 2 tests

### SleepSection

- [ ] **Step 14: Write the failing SleepSection test**

Create `src/components/today/SleepSection.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SleepSection } from './SleepSection'

const defaults = {
  bedtime: '',
  wake_time: '',
  sleep_hours: null as number | null,
  sleep_quality: 3,
}

describe('SleepSection', () => {
  it('renders bedtime and wake time inputs', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/bedtime/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wake time/i)).toBeInTheDocument()
  })

  it('auto-calculates sleep hours when both times are set', async () => {
    const onChange = vi.fn()
    render(<SleepSection values={defaults} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText(/bedtime/i), '22:00')
    await userEvent.type(screen.getByLabelText(/wake time/i), '06:00')

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.sleep_hours).toBe(8)
    })
  })
})
```

- [ ] **Step 15: Run test to verify it fails**

```bash
npx vitest run src/components/today/SleepSection.test.tsx
```

Expected: FAIL — "Cannot find module './SleepSection'"

- [ ] **Step 16: Create `src/components/today/SleepSection.tsx`**

```typescript
import { Slider } from '../ui/Slider'
import { calculateSleepHours } from '../../lib/sleep'

interface SleepValues {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
}

interface SleepSectionProps {
  values: SleepValues
  onChange: (values: SleepValues) => void
}

export function SleepSection({ values, onChange }: SleepSectionProps) {
  const handleBedtime = (bedtime: string) => {
    const hours = bedtime && values.wake_time
      ? calculateSleepHours(bedtime, values.wake_time)
      : values.sleep_hours
    onChange({ ...values, bedtime, sleep_hours: hours })
  }

  const handleWakeTime = (wake_time: string) => {
    const hours = values.bedtime && wake_time
      ? calculateSleepHours(values.bedtime, wake_time)
      : values.sleep_hours
    onChange({ ...values, wake_time, sleep_hours: hours })
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    onChange({ ...values, sleep_hours: isNaN(v) ? null : v })
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Sleep</h2>
      <div className="flex gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="bedtime" className="text-sm text-gray-600">Bedtime</label>
          <input
            id="bedtime"
            type="time"
            value={values.bedtime}
            onChange={e => handleBedtime(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-base"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor="wake_time" className="text-sm text-gray-600">Wake time</label>
          <input
            id="wake_time"
            type="time"
            value={values.wake_time}
            onChange={e => handleWakeTime(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-base"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sleep_hours" className="text-sm text-gray-600">
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
          className="border border-gray-300 rounded-lg p-2 text-base"
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
  )
}
```

- [ ] **Step 17: Run test to verify it passes**

```bash
npx vitest run src/components/today/SleepSection.test.tsx
```

Expected: PASS — 2 tests

### TodayPage

- [ ] **Step 18: Replace `src/components/today/TodayPage.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useDailyLog } from '../../hooks/useDailyLog'
import { MoodSection } from './MoodSection'
import { FoodSection } from './FoodSection'
import { ExerciseSection } from './ExerciseSection'
import { SleepSection } from './SleepSection'

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
}

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
        bedtime: log.bedtime ?? '',
        wake_time: log.wake_time ?? '',
        sleep_hours: log.sleep_hours,
        sleep_quality: log.sleep_quality ?? 3,
      })
    }
  }, [log])

  const toLogData = (f: FormState) => ({
    ...f,
    bedtime: f.bedtime || null,
    wake_time: f.wake_time || null,
  })

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

- [ ] **Step 19: Run all tests to ensure nothing is broken**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 20: Commit**

```bash
git add src/components/
git commit -m "feat: implement Today page with mood, food, exercise, and sleep sections"
```

---

## Task 8: `useLogs` Hook + History Page

**Files:**
- Create: `src/hooks/useLogs.ts`
- Create: `src/hooks/useLogs.test.ts`
- Replace: `src/components/history/HistoryPage.tsx`
- Create: `src/components/history/HistoryEntry.tsx`

- [ ] **Step 1: Write the failing useLogs tests**

Create `src/hooks/useLogs.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLogs } from './useLogs'

const mockLogs = [
  { id: '1', date: '2026-06-18', mood_rating: 6, exercised: true, sleep_hours: 7 },
  { id: '2', date: '2026-06-19', mood_rating: 8, exercised: false, sleep_hours: 8 },
]

const mockOrder = vi.fn().mockResolvedValue({ data: mockLogs, error: null })
const mockLte = vi.fn(() => ({ order: mockOrder }))
const mockGte = vi.fn(() => ({ lte: mockLte }))
const mockSelect = vi.fn(() => ({ gte: mockGte }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: mockSelect })),
  },
}))

beforeEach(() => vi.clearAllMocks())

describe('useLogs', () => {
  it('fetches logs for the given date range', async () => {
    const { result } = renderHook(() => useLogs('2026-06-18', '2026-06-19'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual(mockLogs)
  })

  it('returns empty array when no logs exist', async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useLogs('2026-06-01', '2026-06-10'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.logs).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/hooks/useLogs.test.ts
```

Expected: FAIL — "Cannot find module './useLogs'"

- [ ] **Step 3: Create `src/hooks/useLogs.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyLog } from '../lib/database.types'

export function useLogs(fromDate: string, toDate: string) {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    supabase
      .from('daily_logs')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setLogs(data ?? [])
        setLoading(false)
      })
  }, [fromDate, toDate])

  return { logs, loading, error }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useLogs.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Create `src/components/history/HistoryEntry.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import type { DailyLog } from '../../lib/database.types'

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
    </button>
  )
}
```

- [ ] **Step 6: Replace `src/components/history/HistoryPage.tsx`**

```typescript
import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { HistoryEntry } from './HistoryEntry'

export function HistoryPage() {
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'), [])
  const { logs, loading } = useLogs(fromDate, toDate)

  if (loading) {
    return <div className="text-center text-gray-400 mt-12">Loading…</div>
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-gray-400 mt-12">
        <p>No entries yet.</p>
        <p className="text-sm mt-1">Log your first day on the Today tab.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-gray-900">History</h1>
      {logs.map(log => (
        <HistoryEntry key={log.id} log={log} />
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useLogs.ts src/hooks/useLogs.test.ts src/components/history/
git commit -m "feat: add history page with useLogs hook and entry list"
```

---

## Task 9: Charts Page

**Files:**
- Create: `src/components/charts/MoodChart.tsx`
- Create: `src/components/charts/SleepChart.tsx`
- Create: `src/components/charts/MealsChart.tsx`
- Create: `src/components/charts/ExerciseChart.tsx`
- Replace: `src/components/charts/ChartsPage.tsx`

- [ ] **Step 1: Create `src/components/charts/MoodChart.tsx`**

```typescript
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MoodChartProps {
  logs: DailyLog[]
}

export function MoodChart({ logs }: MoodChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),  // 'MM-DD'
    Mood: l.mood_rating,
    Energy: l.mood_energy,
    Anxiety: l.mood_anxiety,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Mood / Energy / Anxiety</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Mood" stroke="#2563eb" dot={false} connectNulls />
          <Line type="monotone" dataKey="Energy" stroke="#16a34a" dot={false} connectNulls />
          <Line type="monotone" dataKey="Anxiety" stroke="#dc2626" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/charts/SleepChart.tsx`**

```typescript
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface SleepChartProps {
  logs: DailyLog[]
}

export function SleepChart({ logs }: SleepChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Hours: l.sleep_hours,
    Quality: l.sleep_quality,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Sleep</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="hours" type="monotone" dataKey="Hours" stroke="#7c3aed" dot={false} connectNulls />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke="#0891b2" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/charts/MealsChart.tsx`**

```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MealsChartProps {
  logs: DailyLog[]
}

export function MealsChart({ logs }: MealsChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Meals: l.meals_count,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Meals per Day</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="Meals" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/charts/ExerciseChart.tsx`**

```typescript
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface ExerciseChartProps {
  logs: DailyLog[]
}

export function ExerciseChart({ logs }: ExerciseChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    value: l.exercised ? 1 : 0,
  }))

  const exerciseDays = data.filter(d => d.value === 1).length

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Exercise</h2>
        <span className="text-xs text-gray-500">{exerciseDays}/{data.length} days</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [v === 1 ? 'Yes' : 'No', 'Exercised']} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.value ? '#16a34a' : '#e5e7eb'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Replace `src/components/charts/ChartsPage.tsx`**

```typescript
import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { MoodChart } from './MoodChart'
import { SleepChart } from './SleepChart'
import { MealsChart } from './MealsChart'
import { ExerciseChart } from './ExerciseChart'

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function ChartsPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(
    () => format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
    [rangeDays]
  )
  const { logs, loading } = useLogs(fromDate, toDate)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Charts</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-400 mt-8">Loading…</div>}

      {!loading && logs.length === 0 && (
        <div className="text-center text-gray-400 mt-8">
          No entries for this period.
        </div>
      )}

      {!loading && logs.length > 0 && (
        <>
          <MoodChart logs={logs} />
          <SleepChart logs={logs} />
          <MealsChart logs={logs} />
          <ExerciseChart logs={logs} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/
git commit -m "feat: implement charts page with mood, sleep, meals, and exercise trend views"
```

---

## Task 10: PWA Icons + Vercel Deployment

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Create: `vercel.json`

- [ ] **Step 1: Add PWA icons**

Create simple placeholder icons using any image editor, or generate them at https://favicon.io/favicon-generator/. Save:
- `public/icon-192.png` — 192×192 px
- `public/icon-512.png` — 512×512 px

Alternatively, create a minimal SVG icon and convert it, or use a solid color square for now — the app will still install as a PWA.

- [ ] **Step 2: Create `vercel.json`** for SPA routing

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures React Router routes work after a hard refresh or direct URL navigation.

- [ ] **Step 3: Build and check for errors**

```bash
npm run build
```

Expected: Build completes with no TypeScript or Vite errors. Output in `dist/`.

- [ ] **Step 4: Test the production build locally**

```bash
npm run preview
```

Open http://localhost:4173 on your phone (connect to same WiFi, use your machine's local IP). Verify the login page loads and the bottom nav is usable with thumbs.

- [ ] **Step 5: Deploy to Vercel**

```bash
npx vercel
```

When prompted:
- Link to existing project? No — create new
- Project name: `bipolarmoodtracker` (or your choice)
- Framework preset: Vite (auto-detected)

After deploying, go to the Vercel project dashboard → **Settings → Environment Variables** and add:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

Then redeploy: `npx vercel --prod`

- [ ] **Step 6: Add your Vercel URL to Supabase allowed redirect URLs**

In Supabase dashboard → **Authentication → URL Configuration**, add your Vercel URL (e.g. `https://bipolarmoodtracker.vercel.app`) to **Site URL** and **Redirect URLs**.

- [ ] **Step 7: Install as PWA on your phone**

Open your Vercel URL in Safari (iOS) or Chrome (Android). Use "Add to Home Screen" to install the app.

- [ ] **Step 8: Final commit**

```bash
git add public/ vercel.json
git commit -m "feat: add PWA icons and vercel deployment config"
```

---

## Full Test Suite

Run all tests at any time:

```bash
npx vitest run
```

Expected passing tests:
- `src/lib/sleep.test.ts` — 4 tests
- `src/components/auth/LoginPage.test.tsx` — 2 tests
- `src/hooks/useDailyLog.test.ts` — 3 tests
- `src/components/today/MoodSection.test.tsx` — 2 tests
- `src/components/today/FoodSection.test.tsx` — 3 tests
- `src/components/today/ExerciseSection.test.tsx` — 2 tests
- `src/components/today/SleepSection.test.tsx` — 2 tests
- `src/hooks/useLogs.test.ts` — 2 tests

**Total: 20 tests**
