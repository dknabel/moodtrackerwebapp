# Account System — Design Spec

**Date:** 2026-06-21
**Status:** Approved

## Overview

Replace the existing magic-link-only login with a full account system: email + password and Google OAuth, with email verification required for new email/password accounts. No database schema changes; no new environment variables; no new dependencies beyond what Supabase already provides.

---

## Auth Methods

| Method | Sign-up | Sign-in |
|---|---|---|
| Email + password | `supabase.auth.signUp()` | `supabase.auth.signInWithPassword()` |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` | same |

Google OAuth handles its own email verification. New email+password accounts must verify before accessing the app.

---

## Auth Flow

### Sign In
1. User enters email + password → `signInWithPassword()`
2. On success → session set, app loads
3. On failure → inline error

### Sign Up
1. User enters email + password + confirm password → `signUp()`
2. Supabase sends verification email; app shows `VerifyEmailNotice`
3. User clicks link → redirected to app, authenticated

### Google OAuth
1. User clicks "Sign in with Google" → `signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
2. Supabase handles OAuth handshake; user lands back authenticated

### Forgot Password
1. "Forgot password?" link under Sign In form
2. User enters email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })`
3. Supabase sends reset link; app shows confirmation screen
4. Clicking link opens app → `PASSWORD_RECOVERY` auth event detected → `ResetPasswordForm` shown
5. User sets new password → `supabase.auth.updateUser({ password })`

---

## Component Structure

```
src/components/auth/
  AuthPage.tsx             # owns mode state: sign-in | sign-up | forgot-password | verify-email | reset-password
  SignInForm.tsx           # email + password + "Forgot password?" link
  SignUpForm.tsx           # email + password + confirm password
  ForgotPasswordForm.tsx   # email field only, sends reset email
  GoogleButton.tsx         # "Sign in with Google" button, shared
  AuthDivider.tsx          # "or" divider, shared
  VerifyEmailNotice.tsx    # "Check your email" screen shown after sign-up
  ResetPasswordForm.tsx    # new password + confirm, shown after reset link click
```

`App.tsx` renders `<AuthPage />` in place of `<LoginPage />` — no other changes to App.

`useAuth.ts` is unchanged. New Supabase calls live in the components that trigger them.

The `reset-password` mode is entered when `supabase.auth.onAuthStateChange` fires a `PASSWORD_RECOVERY` event, which Supabase emits when the user arrives via a password-reset link.

---

## Supabase Configuration

No schema or RLS changes. `daily_logs.user_id` works the same for all auth methods.

Two one-time dashboard steps:
1. **Enable Google provider** — Authentication → Providers → Google → add Google Cloud client ID + secret
2. **Redirect URL allowlist** — Authentication → URL Configuration → ensure both the production Vercel URL and `http://localhost:5173` are in the allowed list (likely already present from magic link setup)

No new environment variables required.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Wrong password / no account | Inline Supabase error message |
| Passwords don't match (sign-up) | Client-side validation before submit |
| Weak password (<6 chars) | Surface Supabase error inline |
| Email already registered (sign-up) | "Account exists — sign in instead?" with link to switch modes |
| Google popup cancelled | Silent (user stays on login page — standard browser behavior) |
| Reset link expired | "Link expired — request a new one" with link to Forgot Password |
| Email registered via Google, tried password | "This email is linked to Google — use Sign in with Google" |

All submit buttons disable and show loading text while a request is in flight to prevent double-submits.

---

## Out of Scope

- Profile/account settings page (name, avatar)
- MFA / two-factor authentication
- "Remember me" toggle (Supabase persists sessions by default)
- Account deletion
