# Native Google Sign-In — Design Spec

**Date:** 2026-07-16
**Status:** Approved

## Overview

Google sign-in currently works only on web. In the Capacitor-wrapped native app it opens the system browser and strands the user on the plain website, because there is no custom URL scheme registered and no deep-link handler to hand control back to the app after Google/Supabase complete the OAuth exchange. This spec adds the standard Capacitor + Supabase OAuth pattern: an in-app browser session, a custom URL scheme redirect, and a deep-link listener that completes the PKCE code exchange.

Web sign-in is unaffected — this only adds a native-specific code path.

## Architecture

**`GoogleButton.tsx`** branches on platform:
- **Web** (unchanged): `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- **Native**: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'moodtrackerplus://auth/callback', skipBrowserRedirect: true } })`. This returns `{ data: { url } }` without navigating. The URL is opened via `@capacitor/browser`'s `Browser.open({ url })` — an in-app secure browser session (`ASWebAuthenticationSession` on iOS, Custom Tabs on Android), not the bare system browser.

**New hook `useOAuthDeepLink`** (`src/hooks/useOAuthDeepLink.ts`), mounted unconditionally at the app root in `src/App.tsx` — inside the top-level `App` component itself, not `AuthenticatedApp`, since it must work before a session exists. It listens for `App.addListener('appUrlOpen', ({ url }) => ...)` (from `@capacitor/app`, already a dependency). When the URL starts with `moodtrackerplus://auth/callback`, it calls `Browser.close()` then `supabase.auth.exchangeCodeForSession(url)`. URLs that don't match are ignored. The existing `onAuthStateChange` listener in `useAuth.ts` picks up the resulting sign-in automatically — no changes needed there.

**New dependency:** `@capacitor/browser`.

**Native config:**
- `ios/App/App/Info.plist` — add a `CFBundleURLTypes` entry registering `moodtrackerplus` as a URL scheme.
- `android/app/src/main/AndroidManifest.xml` — add an intent-filter on `MainActivity` for `android:scheme="moodtrackerplus"`.

**Manual step (outside this implementation, no dashboard/API access available):** add `moodtrackerplus://auth/callback` to the Supabase project's Authentication → URL Configuration → Redirect URLs allow-list.

## Data Flow

1. User taps "Sign in with Google" in the native app.
2. `signInWithOAuth` (native options) returns the OAuth URL with no navigation.
3. `Browser.open({ url })` opens it in-app.
4. User completes Google login → Google redirects to Supabase's callback → Supabase redirects to `moodtrackerplus://auth/callback?code=...`.
5. iOS/Android hands that URL to the app via the registered scheme; Capacitor fires `appUrlOpen`.
6. `useOAuthDeepLink`'s listener closes the browser and calls `exchangeCodeForSession(url)`, which sets the session.
7. `onAuthStateChange` (existing, in `useAuth.ts`) fires, `App.tsx` renders the authenticated app — same as any other sign-in.

## Error Handling

If `exchangeCodeForSession` fails (user cancels, expired code, malformed URL), fail silently — the in-app browser is already closed and the user remains on the sign-in screen. No error toast for this pass, matching the existing `GoogleButton`'s web path, which also has no error handling today. Web sign-in is completely untouched by this change.

## Testing

- `GoogleButton.test.tsx` (existing file, new test added): with `Capacitor.isNativePlatform()` mocked true, clicking the button calls `signInWithOAuth` with `skipBrowserRedirect: true` and `redirectTo: 'moodtrackerplus://auth/callback'`, then `Browser.open()` with the URL `signInWithOAuth` returned. The existing web-path test is unchanged.
- New `useOAuthDeepLink.test.ts`: firing the mocked `appUrlOpen` listener with a `moodtrackerplus://auth/callback?code=...` URL triggers `Browser.close()` and `exchangeCodeForSession()` with that URL. Firing it with an unrelated URL (e.g. some other future deep link) does neither — the match is explicit, not assumed.

## Out of Scope

- Apple Sign-In (not implemented on web either — only Google + email/password exist today).
- Automatically configuring Supabase's redirect-URL allow-list (manual dashboard step, called out above).
- Universal Links / App Links — a custom URL scheme is simpler and standard for this OAuth handshake, with no server-side association file needed.
- Error UI/toasts for a failed or cancelled native OAuth attempt (silent no-op, matching existing web-path behavior).
