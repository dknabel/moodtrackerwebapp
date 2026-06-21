# Account System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the magic-link-only login with email+password and Google OAuth, requiring email verification for new email/password accounts.

**Architecture:** `AuthPage` is a single component that owns mode state (`sign-in | sign-up | forgot-password | verify-email | reset-password`) and renders the appropriate child form. All Supabase auth calls live in the form components that trigger them. `useAuth` gains an `isPasswordRecovery` flag to detect when the user arrived via a password-reset link.

**Tech Stack:** React 19, TypeScript, Supabase JS v2, Tailwind CSS v4, Vitest, React Testing Library

## Global Constraints

- All tests use `vi.mock('../../lib/supabase', ...)` — never real network calls
- Tailwind classes only — no inline styles
- No new npm dependencies
- Test files co-located with source files
- Run `npm test` to verify after each task

---

## File Map

**Create:**
- `src/components/auth/AuthPage.tsx` — top-level auth component, owns mode state
- `src/components/auth/AuthPage.test.tsx`
- `src/components/auth/GoogleButton.tsx` — shared "Sign in with Google" button
- `src/components/auth/GoogleButton.test.tsx`
- `src/components/auth/AuthDivider.tsx` — shared "or" divider (presentational, no test)
- `src/components/auth/VerifyEmailNotice.tsx` — "check your email" screen (presentational, no test)
- `src/components/auth/SignInForm.tsx`
- `src/components/auth/SignInForm.test.tsx`
- `src/components/auth/SignUpForm.tsx`
- `src/components/auth/SignUpForm.test.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ForgotPasswordForm.test.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.test.tsx`

**Modify:**
- `src/hooks/useAuth.ts` — add `isPasswordRecovery` boolean, thread `event` through `onAuthStateChange`
- `src/App.tsx` — replace `<LoginPage />` with `<AuthPage initialMode={...} />`

**Delete:**
- `src/components/auth/LoginPage.tsx`
- `src/components/auth/LoginPage.test.tsx`

---

### Task 1: Update useAuth to detect PASSWORD_RECOVERY

**Files:**
- Modify: `src/hooks/useAuth.ts`

**Interfaces:**
- Produces: `useAuth()` now returns `{ session, loading, signOut, isPasswordRecovery }` where `isPasswordRecovery: boolean` is `true` when the most recent auth event was `PASSWORD_RECOVERY`

- [ ] **Step 1: Replace the full contents of `src/hooks/useAuth.ts`**

```typescript
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => setSession(session))
      .finally(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsPasswordRecovery(event === 'PASSWORD_RECOVERY')
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  return { session, loading, signOut, isPasswordRecovery }
}
```

- [ ] **Step 2: Run the existing test suite to confirm nothing broke**

```bash
npm test
```

Expected: all existing tests pass (useDailyLog, useLogs, FoodSection, etc.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: track PASSWORD_RECOVERY event in useAuth"
```

---

### Task 2: Shared UI components — GoogleButton, AuthDivider, VerifyEmailNotice

**Files:**
- Create: `src/components/auth/GoogleButton.tsx`
- Create: `src/components/auth/GoogleButton.test.tsx`
- Create: `src/components/auth/AuthDivider.tsx`
- Create: `src/components/auth/VerifyEmailNotice.tsx`

**Interfaces:**
- `GoogleButton` — no props; calls `supabase.auth.signInWithOAuth` on click
- `AuthDivider` — no props; renders "or" divider
- `VerifyEmailNotice({ email: string })` — displays confirmation message

- [ ] **Step 1: Write the failing test for GoogleButton**

Create `src/components/auth/GoogleButton.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleButton } from './GoogleButton'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

describe('GoogleButton', () => {
  it('calls signInWithOAuth with google provider and redirectTo on click', async () => {
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- --reporter=verbose GoogleButton
```

Expected: FAIL — `GoogleButton` not found

- [ ] **Step 3: Create GoogleButton**

Create `src/components/auth/GoogleButton.tsx`:

```typescript
import { supabase } from '../../lib/supabase'

export function GoogleButton() {
  const handleClick = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full max-w-sm border border-gray-300 rounded-lg p-3 font-medium flex items-center justify-center gap-2 bg-white"
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

- [ ] **Step 4: Create AuthDivider**

Create `src/components/auth/AuthDivider.tsx`:

```typescript
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 w-full max-w-sm">
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-sm text-gray-400">or</span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  )
}
```

- [ ] **Step 5: Create VerifyEmailNotice**

Create `src/components/auth/VerifyEmailNotice.tsx`:

```typescript
interface Props {
  email: string
}

export function VerifyEmailNotice({ email }: Props) {
  return (
    <div className="text-center max-w-sm">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
      <p className="text-gray-500 text-sm">
        We sent a verification link to <strong>{email}</strong>. Click it to finish signing up.
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
npm test -- --reporter=verbose GoogleButton
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/GoogleButton.tsx src/components/auth/GoogleButton.test.tsx src/components/auth/AuthDivider.tsx src/components/auth/VerifyEmailNotice.tsx
git commit -m "feat: add GoogleButton, AuthDivider, VerifyEmailNotice shared components"
```

---

### Task 3: SignInForm

**Files:**
- Create: `src/components/auth/SignInForm.tsx`
- Create: `src/components/auth/SignInForm.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.signInWithPassword`
- `SignInForm({ onForgotPassword: () => void })` — calls `onForgotPassword` when "Forgot password?" is clicked; on successful auth, Supabase fires `onAuthStateChange` which `useAuth` picks up (no explicit success callback needed)

- [ ] **Step 1: Write the failing tests**

Create `src/components/auth/SignInForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInForm } from './SignInForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SignInForm', () => {
  it('calls signInWithPassword with email and password on submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {} as any, error: null })

    render(<SignInForm onForgotPassword={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      })
    })
  })

  it('shows error message on sign-in failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {} as any,
      error: { message: 'Invalid login credentials' } as any,
    })

    render(<SignInForm onForgotPassword={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    })
  })

  it('calls onForgotPassword when the link is clicked', async () => {
    const onForgotPassword = vi.fn()
    render(<SignInForm onForgotPassword={onForgotPassword} />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(onForgotPassword).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose SignInForm
```

Expected: FAIL — `SignInForm` not found

- [ ] **Step 3: Create SignInForm**

Create `src/components/auth/SignInForm.tsx`:

```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  onForgotPassword: () => void
}

export function SignInForm({ onForgotPassword }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={onForgotPassword}
        className="text-sm text-blue-600 text-center"
      >
        Forgot password?
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to confirm all three pass**

```bash
npm test -- --reporter=verbose SignInForm
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SignInForm.tsx src/components/auth/SignInForm.test.tsx
git commit -m "feat: add SignInForm with email/password and forgot-password link"
```

---

### Task 4: SignUpForm

**Files:**
- Create: `src/components/auth/SignUpForm.tsx`
- Create: `src/components/auth/SignUpForm.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.signUp`, `VerifyEmailNotice`
- `SignUpForm({ onSuccess: (email: string) => void })` — calls `onSuccess(email)` after successful `signUp`; parent (AuthPage) transitions to `verify-email` mode using that email

- [ ] **Step 1: Write the failing tests**

Create `src/components/auth/SignUpForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignUpForm } from './SignUpForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillSignUpForm(email: string, password: string, confirm: string) {
  await userEvent.type(screen.getByPlaceholderText(/your@email/i), email)
  await userEvent.type(screen.getByPlaceholderText(/^password$/i), password)
  await userEvent.type(screen.getByPlaceholderText(/^confirm password$/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))
}

describe('SignUpForm', () => {
  it('shows password mismatch error without calling signUp', async () => {
    render(<SignUpForm onSuccess={vi.fn()} />)
    await fillSignUpForm('user@example.com', 'abc123', 'different')
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('calls onSuccess with the email when signUp succeeds', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: {} as any, error: null })
    const onSuccess = vi.fn()
    render(<SignUpForm onSuccess={onSuccess} />)
    await fillSignUpForm('user@example.com', 'secret123', 'secret123')
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('user@example.com')
    })
  })

  it('shows error message on signUp failure', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {} as any,
      error: { message: 'User already registered' } as any,
    })
    render(<SignUpForm onSuccess={vi.fn()} />)
    await fillSignUpForm('user@example.com', 'secret123', 'secret123')
    await waitFor(() => {
      expect(screen.getByText(/user already registered/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose SignUpForm
```

Expected: FAIL — `SignUpForm` not found

- [ ] **Step 3: Create SignUpForm**

Create `src/components/auth/SignUpForm.tsx`:

```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  onSuccess: (email: string) => void
}

export function SignUpForm({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
    } else {
      onSuccess(email)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm password"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to confirm all three pass**

```bash
npm test -- --reporter=verbose SignUpForm
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SignUpForm.tsx src/components/auth/SignUpForm.test.tsx
git commit -m "feat: add SignUpForm with password confirmation and onSuccess callback"
```

---

### Task 5: ForgotPasswordForm

**Files:**
- Create: `src/components/auth/ForgotPasswordForm.tsx`
- Create: `src/components/auth/ForgotPasswordForm.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.resetPasswordForEmail`
- `ForgotPasswordForm()` — no props; manages its own sent/confirmation state

- [ ] **Step 1: Write the failing tests**

Create `src/components/auth/ForgotPasswordForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from './ForgotPasswordForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ForgotPasswordForm', () => {
  it('calls resetPasswordForEmail with redirectTo and shows confirmation on success', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {} as any, error: null })

    render(<ForgotPasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument()
    })
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: window.location.origin }
    )
  })

  it('shows error message on failure', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {} as any,
      error: { message: 'Email not found' } as any,
    })

    render(<ForgotPasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'nobody@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/email not found/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose ForgotPasswordForm
```

Expected: FAIL — `ForgotPasswordForm` not found

- [ ] **Step 3: Create ForgotPasswordForm**

Create `src/components/auth/ForgotPasswordForm.tsx`:

```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
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
      <p className="text-gray-700 text-sm text-center max-w-sm">
        Password reset email sent. Check your inbox and click the link.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to confirm both pass**

```bash
npm test -- --reporter=verbose ForgotPasswordForm
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ForgotPasswordForm.tsx src/components/auth/ForgotPasswordForm.test.tsx
git commit -m "feat: add ForgotPasswordForm"
```

---

### Task 6: ResetPasswordForm

**Files:**
- Create: `src/components/auth/ResetPasswordForm.tsx`
- Create: `src/components/auth/ResetPasswordForm.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.updateUser`
- `ResetPasswordForm()` — no props; shown when user arrives via a password-reset link (Supabase fires `PASSWORD_RECOVERY` and sets a session); after `updateUser` succeeds, `useAuth` picks up the `USER_UPDATED` event, clears `isPasswordRecovery`, and `App.tsx` transitions to the main app

- [ ] **Step 1: Write the failing tests**

Create `src/components/auth/ResetPasswordForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from './ResetPasswordForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillResetForm(password: string, confirm: string) {
  await userEvent.type(screen.getByPlaceholderText(/^new password$/i), password)
  await userEvent.type(screen.getByPlaceholderText(/^confirm new password$/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /update password/i }))
}

describe('ResetPasswordForm', () => {
  it('shows mismatch error without calling updateUser', async () => {
    render(<ResetPasswordForm />)
    await fillResetForm('abc123', 'different')
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with new password and shows success message on match', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {} as any, error: null })
    render(<ResetPasswordForm />)
    await fillResetForm('newpass123', 'newpass123')
    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument()
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('shows error message on updateUser failure', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: {} as any,
      error: { message: 'Password is too weak' } as any,
    })
    render(<ResetPasswordForm />)
    await fillResetForm('abc', 'abc')
    await waitFor(() => {
      expect(screen.getByText(/password is too weak/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose ResetPasswordForm
```

Expected: FAIL — `ResetPasswordForm` not found

- [ ] **Step 3: Create ResetPasswordForm**

Create `src/components/auth/ResetPasswordForm.tsx`:

```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <p className="text-gray-700 text-sm text-center max-w-sm">
        Password updated. You're now signed in.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <p className="text-gray-500 text-sm text-center">Choose a new password</p>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="New password"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        required
        className="border border-gray-300 rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to confirm all three pass**

```bash
npm test -- --reporter=verbose ResetPasswordForm
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/ResetPasswordForm.tsx src/components/auth/ResetPasswordForm.test.tsx
git commit -m "feat: add ResetPasswordForm with password confirmation"
```

---

### Task 7: AuthPage, update App.tsx, delete LoginPage

**Files:**
- Create: `src/components/auth/AuthPage.tsx`
- Create: `src/components/auth/AuthPage.test.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/auth/LoginPage.tsx`
- Delete: `src/components/auth/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `SignInForm`, `SignUpForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `GoogleButton`, `AuthDivider`, `VerifyEmailNotice`
- `AuthPage({ initialMode?: 'sign-in' | 'sign-up' | 'forgot-password' | 'verify-email' | 'reset-password' })` — defaults to `'sign-in'`

- [ ] **Step 1: Write the failing tests for AuthPage**

Create `src/components/auth/AuthPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthPage } from './AuthPage'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthPage', () => {
  it('shows sign-in form and Google button by default', () => {
    render(<AuthPage />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('switches to sign-up mode when "Sign up" is clicked', async () => {
    render(<AuthPage />)
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('switches back to sign-in from sign-up', async () => {
    render(<AuthPage initialMode="sign-up" />)
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument()
  })

  it('switches to forgot-password mode when "Forgot password?" is clicked', async () => {
    render(<AuthPage />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('switches back to sign-in from forgot-password', async () => {
    render(<AuthPage initialMode="forgot-password" />)
    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('shows verify-email notice after successful sign-up', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: {} as any, error: null })
    render(<AuthPage initialMode="sign-up" />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secret123')
    await userEvent.type(screen.getByPlaceholderText(/^confirm password$/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument()
    })
  })

  it('shows reset-password form when initialMode is reset-password', () => {
    render(<AuthPage initialMode="reset-password" />)
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
npm test -- --reporter=verbose AuthPage
```

Expected: FAIL — `AuthPage` not found

- [ ] **Step 3: Create AuthPage**

Create `src/components/auth/AuthPage.tsx`:

```typescript
import { useState } from 'react'
import { GoogleButton } from './GoogleButton'
import { AuthDivider } from './AuthDivider'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { VerifyEmailNotice } from './VerifyEmailNotice'
import { ResetPasswordForm } from './ResetPasswordForm'

type Mode = 'sign-in' | 'sign-up' | 'forgot-password' | 'verify-email' | 'reset-password'

interface Props {
  initialMode?: Mode
}

export function AuthPage({ initialMode = 'sign-in' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [verifyEmail, setVerifyEmail] = useState('')

  const handleSignUpSuccess = (email: string) => {
    setVerifyEmail(email)
    setMode('verify-email')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-2xl font-bold text-gray-900">Mood Tracker</h1>

      {mode === 'verify-email' && <VerifyEmailNotice email={verifyEmail} />}

      {mode === 'reset-password' && <ResetPasswordForm />}

      {mode === 'forgot-password' && (
        <>
          <p className="text-gray-500 text-sm">Reset your password</p>
          <ForgotPasswordForm />
          <button
            type="button"
            onClick={() => setMode('sign-in')}
            className="text-sm text-blue-600"
          >
            Back to sign in
          </button>
        </>
      )}

      {(mode === 'sign-in' || mode === 'sign-up') && (
        <>
          <p className="text-gray-500 text-sm">
            {mode === 'sign-in' ? 'Sign in to your account' : 'Create an account'}
          </p>
          <GoogleButton />
          <AuthDivider />
          {mode === 'sign-in' && (
            <SignInForm onForgotPassword={() => setMode('forgot-password')} />
          )}
          {mode === 'sign-up' && (
            <SignUpForm onSuccess={handleSignUpSuccess} />
          )}
          <p className="text-sm text-gray-500">
            {mode === 'sign-in' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('sign-up')}
                  className="text-blue-600"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('sign-in')}
                  className="text-blue-600"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run AuthPage tests to confirm all pass**

```bash
npm test -- --reporter=verbose AuthPage
```

Expected: PASS — 7 tests

- [ ] **Step 5: Update App.tsx**

Replace the full contents of `src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './components/auth/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { TodayPage } from './components/today/TodayPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ChartsPage } from './components/charts/ChartsPage'

export function App() {
  const { session, loading, isPasswordRecovery } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    )
  }

  if (!session || isPasswordRecovery) {
    return <AuthPage initialMode={isPasswordRecovery ? 'reset-password' : 'sign-in'} />
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

- [ ] **Step 6: Delete LoginPage files**

```bash
rm src/components/auth/LoginPage.tsx src/components/auth/LoginPage.test.tsx
```

- [ ] **Step 7: Run the full test suite**

```bash
npm test
```

Expected: all tests pass; no references to `LoginPage` remain

- [ ] **Step 8: Commit**

```bash
git add src/components/auth/AuthPage.tsx src/components/auth/AuthPage.test.tsx src/App.tsx
git commit -m "feat: wire AuthPage into App, replace LoginPage with account system"
```

---

## Supabase Dashboard Steps (manual, outside code)

After all tasks are complete, do these one-time steps in the Supabase dashboard:

1. **Enable Google provider** — Authentication → Providers → Google → toggle on → paste Google Cloud OAuth client ID and secret
2. **Verify redirect URLs** — Authentication → URL Configuration → confirm both `https://<your-vercel-domain>` and `http://localhost:5173` are in the Redirect URLs list
