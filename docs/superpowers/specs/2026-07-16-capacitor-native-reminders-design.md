# Capacitor Native Wrap + Reminders — Design Spec

**Date:** 2026-07-16
**Status:** Approved

## Overview

Wrap the existing Vite/React/Supabase web app with [Capacitor](https://capacitorjs.com/) to ship real iOS and Android apps, primarily to support native local notifications for reminders (daily log check-ins and medication times). This replaces the earlier SwiftUI native rewrite plan, which has been scrapped — see `docs/superpowers/specs/2026-06-22-swiftui-rewrite-design.md` (historical only, no longer active).

The web app's PWA install path (`vite-plugin-pwa`) doesn't reliably solve this: iOS web push requires the user to have already manually added the site to their home screen, which most users won't discover. A Capacitor-wrapped native app gets a real install (App Store / Play Store) and native local notifications, while reusing 100% of the existing `src/` codebase — no fork, no parallel codebase.

This spec covers building and running iOS and Android apps with reminder notifications. It does **not** cover App Store / Play Store submission or public distribution — that's a separate, later step.

## Architecture

**Project layout:** Add `ios/` and `android/` native projects at the repo root via `npx cap add ios` / `npx cap add android` (standard Capacitor scaffold), committed to the repo. The existing React app is unchanged except for a new Capacitor-aware reminders module. Same `src/` ships to web, iOS, and Android.

**New dependencies:**
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `@capacitor/local-notifications` — schedules/cancels native notifications, handles permission prompts, delivers "notification tapped" events back into JS
- `@capacitor/app` — detects foreground/resume events (used to re-sync scheduled notifications)

**Loading model:** Bundled, not remote. `capacitor.config.ts` sets `webDir: 'dist'` with no `server.url` — the native shell loads the built app from local files, same as a normal Capacitor app. This means:
- The UI shell renders instantly with no network (Supabase data calls still need network)
- JS/UI changes require a new native build to ship (via `npx cap sync` + a new App Store/Play Store build), unlike the web deploy which is instant
- No conflict between the PWA service worker and Capacitor's own WebView — the two loading models were the main reason to prefer bundled over a remote WebView pointed at moodtracker.plus

**Build:** `npm run build` produces `dist/`, then `npx cap sync` copies it into both native projects. This is an additional step alongside the existing web build/deploy, not a replacement for it.

## Data model

New Supabase table, RLS-scoped to `user_id` like the rest of the schema:

```sql
create table reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('daily_log', 'medication')),
  medication_id uuid references medications(id),  -- null for daily_log
  time time not null,           -- HH:MM, local device time
  label text,                   -- optional user-facing text, e.g. "Evening check-in"
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
```

`medication_id` is nullable and only set for `kind = 'medication'`. A user can have multiple `daily_log` reminders (e.g. morning + evening check-ins). A medication reminder is independent of, but pre-filled from, that medication's existing `scheduled_time`.

## Native scheduling & permissions

**Reconciliation, not queuing.** Local notifications don't know about the database — the app keeps them in sync itself. On app launch and on every foreground/resume (via `@capacitor/app`'s `appStateChange` listener):
1. Fetch the current user's `reminders` where `enabled = true`
2. Cancel all previously-scheduled local notifications (`LocalNotifications.cancel`)
3. Re-schedule one recurring local notification per row (`LocalNotifications.schedule`, `repeats: true`, `on: { hour, minute }`)

Cancel-and-rebuild is simple and avoids drift bugs (stale notifications for a deleted reminder, duplicate notifications after an edited time), at the cost of some redundant work on every foreground — negligible for a handful of reminders.

**Permissions:** The first time a user enables any reminder, the app calls `LocalNotifications.requestPermissions()`. If denied, the toggle reverts and the UI shows a message pointing to system Settings (apps cannot re-prompt after a denial on iOS or Android 13+, only deep-link to Settings).

**Tap behavior:** All reminder notifications open the app to the Today view. Handled via `LocalNotifications.addListener('localNotificationActionPerformed', ...)`. Deep-linking a medication reminder directly to the Meds section is a nice-to-have, not required for this design.

## UI

A new **Reminders** screen, reachable from Settings/nav, with two sections:
- **Daily log reminders** — user-added rows, each with a time picker, optional label, on/off toggle, delete
- **Medication reminders** — one row per existing medication, time picker pre-filled from `scheduled_time` if set, on/off toggle (no delete — lifecycle tied to the medication itself)

Built from existing form primitives in `src/components/ui` (time input, toggle) — a plain CRUD screen, no new design system needed.

**Web/PWA behavior:** The Reminders screen still works on web for managing reminder rows (they're just Supabase data), but the on/off toggle for actual notification scheduling is disabled/hidden when `Capacitor.isNativePlatform()` is false, since there's no native scheduler to back it there.

## Build & tooling

- `capacitor.config.ts` at repo root (app id e.g. `com.moodtracker.plus`, `webDir: 'dist'`)
- `ios/` and `android/` native projects committed to the repo (holds Xcode/Gradle config, entitlements, icons)
- New npm scripts: `cap:sync` (build + `cap sync`), `cap:ios` / `cap:android` (open in Xcode / Android Studio)
- iOS builds require a Mac + Xcode. Device testing needs an Apple Developer account for code signing; simulator testing doesn't, but local notification delivery on the simulator is unreliable, so real-device testing is expected

## Testing

- Unit test the reconciliation logic (given a list of reminder rows, which `schedule`/`cancel` calls result) — a thin, mockable wrapper around the plugin
- Manual device testing for: permission prompts, notification delivery, tap-to-open behavior, and time zone correctness (reminders fire on device local time, not UTC)

## Out of scope

- Push notifications (server-sent) — everything here is locally-scheduled at user-set times, no push infrastructure needed
- App Store / Play Store submission and public distribution
- iPad/tablet-specific layout
- Notification snooze/reschedule actions
- Deep-linking medication reminders directly to the Meds section (opens Today view for all reminder types)
