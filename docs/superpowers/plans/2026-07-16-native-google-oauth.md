# Native Google Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Google sign-in work in the native iOS/Android app by opening an in-app browser for the OAuth flow and completing it via a custom URL scheme deep link, without changing web behavior.

**Architecture:** `GoogleButton` branches on `isNativePlatform()`: native calls `signInWithOAuth` with `skipBrowserRedirect: true` and opens the returned URL via `@capacitor/browser`; a new `useOAuthDeepLink` hook listens for the `moodtrackerplus://auth/callback` redirect via `@capacitor/app`'s `appUrlOpen` event and completes the session with `supabase.auth.exchangeCodeForSession`.

**Tech Stack:** `@capacitor/browser` (new), existing `@capacitor/app`/`@capacitor/core`, Supabase Auth (PKCE flow, `signInWithOAuth`/`exchangeCodeForSession`), existing React/Vite/Vitest stack.

## Global Constraints

- Custom URL scheme is exactly `moodtrackerplus`; the full callback URL is `moodtrackerplus://auth/callback`.
- Web sign-in behavior must not change — the native branch is additive only.
- No error UI/toast for a failed or cancelled native OAuth attempt (spec: silent no-op, matching the existing web path's lack of error handling).
- Apple Sign-In, Universal Links/App Links, and automatically configuring Supabase's redirect-URL allow-list are explicitly out of scope.

---

## File Structure

- `src/components/auth/GoogleButton.tsx` — add native branch (modify)
- `src/components/auth/GoogleButton.test.tsx` — add native-path tests (modify)
- `src/hooks/useOAuthDeepLink.ts` — new deep-link listener hook (create)
- `src/hooks/useOAuthDeepLink.test.ts` — tests (create)
- `package.json` — add `@capacitor/browser` (modify)
- `ios/App/App/Info.plist` — register `moodtrackerplus` URL scheme (modify)
- `android/app/src/main/AndroidManifest.xml` — add intent-filter for the scheme (modify)
- `src/App.tsx` — mount `useOAuthDeepLink()` unconditionally (modify)

---

### Task 1: Native branch in GoogleButton

**Files:**
- Modify: `src/components/auth/GoogleButton.tsx`
- Modify: `src/components/auth/GoogleButton.test.tsx`

**Interfaces:**
- Consumes: `isNativePlatform` from `src/lib/notifications.ts` (existing), `supabase` from `src/lib/supabase.ts` (existing), `Browser` from `@capacitor/browser` (installed in Task 3 — this task's tests mock it, so the real package doesn't need to be installed yet for tests to pass, but `npm run build` will fail until Task 3 installs it; that's expected and resolved by Task 3).
- Produces: no new exports — `GoogleButton` keeps its existing default/named export shape.

- [ ] **Step 1: Write the failing tests**

Replace `src/components/auth/GoogleButton.test.tsx` with:

```tsx
// src/components/auth/GoogleButton.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleButton } from './GoogleButton'

const mockSignInWithOAuth = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
}))

const mockIsNativePlatform = vi.fn(() => false)
vi.mock('../../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
}))

const mockBrowserOpen = vi.fn()
vi.mock('@capacitor/browser', () => ({
  Browser: { open: (...args: unknown[]) => mockBrowserOpen(...args) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(false)
  mockSignInWithOAuth.mockResolvedValue({ data: { url: null } })
})

describe('GoogleButton', () => {
  it('calls signInWithOAuth with google provider and redirectTo on click (web)', async () => {
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    expect(mockBrowserOpen).not.toHaveBeenCalled()
  })

  it('opens an in-app browser with the OAuth URL on native', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2/auth?client_id=abc' } })
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'moodtrackerplus://auth/callback', skipBrowserRedirect: true },
    })
    expect(mockBrowserOpen).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/auth?client_id=abc' })
  })

  it('does not open a browser on native if no url is returned', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null } })
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(mockBrowserOpen).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/auth/GoogleButton.test.tsx`
Expected: FAIL — the current implementation calls `supabase.auth.signInWithOAuth` unconditionally with the web-only options object, so the native-path assertions fail and `@capacitor/browser` isn't imported yet.

- [ ] **Step 3: Write the implementation**

Replace `src/components/auth/GoogleButton.tsx` with:

```tsx
// src/components/auth/GoogleButton.tsx
import { Browser } from '@capacitor/browser'
import { isNativePlatform } from '../../lib/notifications'
import { supabase } from '../../lib/supabase'

const NATIVE_REDIRECT = 'moodtrackerplus://auth/callback'

export function GoogleButton() {
  const handleClick = async () => {
    if (isNativePlatform()) {
      const { data } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
      })
      if (data.url) await Browser.open({ url: data.url })
      return
    }
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="w-full max-w-sm border border-gray-300 dark:border-gray-600 rounded-lg p-3 font-medium flex items-center justify-center gap-2 bg-white dark:bg-gray-800 dark:text-white"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </button>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/auth/GoogleButton.test.tsx`
Expected: FAIL on the two native-path tests only, with an error resolving `@capacitor/browser` (module not installed yet) — this is expected until Task 3 installs the package. Confirm the failure is specifically a missing-module error and not a logic error in the test/implementation code (read the error output before moving on).

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/GoogleButton.tsx src/components/auth/GoogleButton.test.tsx
git commit -m "feat: add native OAuth branch to GoogleButton"
```

---

### Task 2: useOAuthDeepLink hook

**Files:**
- Create: `src/hooks/useOAuthDeepLink.ts`
- Create: `src/hooks/useOAuthDeepLink.test.ts`

**Interfaces:**
- Consumes: `isNativePlatform` from `src/lib/notifications.ts` (existing), `supabase` from `src/lib/supabase.ts` (existing), `App` from `@capacitor/app` (existing dependency), `Browser` from `@capacitor/browser` (installed in Task 3 — same expected-failure situation as Task 1 until then).
- Produces: `useOAuthDeepLink(): void`, mounted in Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/useOAuthDeepLink.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockAddListener = vi.fn(() => Promise.resolve({ remove: vi.fn() }))
vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => mockAddListener(...args) },
}))

const mockBrowserClose = vi.fn()
vi.mock('@capacitor/browser', () => ({
  Browser: { close: (...args: unknown[]) => mockBrowserClose(...args) },
}))

const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args) } },
}))

const mockIsNativePlatform = vi.fn(() => true)
vi.mock('../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
}))

import { useOAuthDeepLink } from './useOAuthDeepLink'

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
})

describe('useOAuthDeepLink', () => {
  it('does not register a listener when not on a native platform', () => {
    mockIsNativePlatform.mockReturnValue(false)
    renderHook(() => useOAuthDeepLink())
    expect(mockAddListener).not.toHaveBeenCalled()
  })

  it('registers an appUrlOpen listener when native', () => {
    renderHook(() => useOAuthDeepLink())
    expect(mockAddListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function))
  })

  it('closes the browser and exchanges the code when the callback URL is opened', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'moodtrackerplus://auth/callback?code=abc123' })

    expect(mockBrowserClose).toHaveBeenCalled()
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('moodtrackerplus://auth/callback?code=abc123')
  })

  it('ignores URLs that do not match the callback prefix', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'someotherapp://something' })

    expect(mockBrowserClose).not.toHaveBeenCalled()
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useOAuthDeepLink.test.ts`
Expected: FAIL — `Cannot find module './useOAuthDeepLink'`

- [ ] **Step 3: Write the implementation**

```ts
// src/hooks/useOAuthDeepLink.ts
import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { isNativePlatform } from '../lib/notifications'

const CALLBACK_PREFIX = 'moodtrackerplus://auth/callback'

export function useOAuthDeepLink(): void {
  useEffect(() => {
    if (!isNativePlatform()) return

    let listener: { remove: () => void } | null = null
    void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!url.startsWith(CALLBACK_PREFIX)) return
      void Browser.close()
      void supabase.auth.exchangeCodeForSession(url)
    }).then(handle => {
      listener = handle
    })
    return () => { listener?.remove() }
  }, [])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useOAuthDeepLink.test.ts`
Expected: FAIL with a missing-module error for `@capacitor/browser` (not installed yet) — expected until Task 3. Confirm the failure is specifically the missing module, not a logic error.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useOAuthDeepLink.ts src/hooks/useOAuthDeepLink.test.ts
git commit -m "feat: add useOAuthDeepLink hook"
```

---

### Task 3: Install @capacitor/browser, native config, and wire into App.tsx

**Files:**
- Modify: `package.json`
- Modify: `ios/App/App/Info.plist`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useOAuthDeepLink` (Task 2), `@capacitor/browser` (installed here — the dependency Tasks 1 and 2 were mocking).

- [ ] **Step 1: Install @capacitor/browser**

Run: `npm install @capacitor/browser`
Expected: `package.json` gains the new dependency.

- [ ] **Step 2: Run Task 1 and Task 2's tests to confirm they now pass**

Run: `npx vitest run src/components/auth/GoogleButton.test.tsx src/hooks/useOAuthDeepLink.test.ts`
Expected: PASS (3 tests in GoogleButton, 4 in useOAuthDeepLink) — the missing-module failures from Tasks 1 and 2 are resolved now that the real package is installed.

- [ ] **Step 3: Register the URL scheme in Info.plist**

In `ios/App/App/Info.plist`, add this entry directly before the closing `</dict>` (i.e. as the last key before `</dict>\n</plist>`):

```xml
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>moodtrackerplus</string>
			</array>
		</dict>
	</array>
```

- [ ] **Step 4: Register the URL scheme in AndroidManifest.xml**

In `android/app/src/main/AndroidManifest.xml`, add a second `<intent-filter>` inside the existing `<activity>` block (for `.MainActivity`), immediately after the existing launcher `<intent-filter>` and before `</activity>`:

```xml
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="moodtrackerplus" />
            </intent-filter>
```

- [ ] **Step 5: Mount useOAuthDeepLink in App.tsx**

In `src/App.tsx`, add the import and call `useOAuthDeepLink()` unconditionally at the top of the outer `App` component (before the `useAuth()` call), since the deep link must be handled even before a session exists:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './hooks/useAuth'
import { useNotificationSync } from './hooks/useNotificationSync'
import { useOAuthDeepLink } from './hooks/useOAuthDeepLink'
import { AuthPage } from './components/auth/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TodayPage } from './components/today/TodayPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ChartsPage } from './components/charts/ChartsPage'
import { RemindersPage } from './components/reminders/RemindersPage'

export function App() {
  useOAuthDeepLink()
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

(Only the new import and the `useOAuthDeepLink()` call at the top of `App` are new — everything else in the file is unchanged.)

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new/updated tests from Tasks 1 and 2.

- [ ] **Step 7: Typecheck and lint**

Run: `npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 8: Sync native projects**

Run: `npm run cap:sync`
Expected: succeeds, prints sync confirmation for both `ios` and `android`. (Do not run `npm run cap:ios`/`cap:android` — those open GUI applications and are out of scope for this step; opening/building in Xcode or Android Studio is a manual follow-up.)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json ios/App/App/Info.plist android/app/src/main/AndroidManifest.xml src/App.tsx
git commit -m "feat: wire native Google OAuth deep link into the app"
```

---

## Self-Review Notes

- **Spec coverage:** native branch in `GoogleButton` (Task 1), in-app browser via `@capacitor/browser` (Tasks 1 & 3), custom URL scheme registered on both platforms (Task 3), `appUrlOpen` deep-link handling + `exchangeCodeForSession` (Task 2), unconditional mount before session exists (Task 3), web behavior unchanged (Task 1, tested). Apple Sign-In, Universal Links, Supabase dashboard config, and error UI are explicitly out of scope per the spec and are not tasked. The Supabase dashboard redirect-URL allow-list change remains a manual step for the user — not something any task can perform.
- **Type consistency:** `NATIVE_REDIRECT`/`CALLBACK_PREFIX` are both the literal string `'moodtrackerplus://auth/callback'` in Tasks 1 and 2 respectively — same value, matching the plan's Global Constraints.
