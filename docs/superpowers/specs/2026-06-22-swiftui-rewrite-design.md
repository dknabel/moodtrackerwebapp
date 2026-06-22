# SwiftUI Native Rewrite — Design Spec

**Date:** 2026-06-22
**Status:** Approved

## Overview

Native iOS rewrite of the bipolar mood tracker as a SwiftUI app. Strict feature parity with the web app. Supabase backend is unchanged. Recharts replaced with Swift Charts. Target: iPhone only, iOS 17+.

Xcode project location: `~/Documents/moodtracker/moodtracker+`

## Architecture

Three layers: views, view models, data/Supabase. A single `SupabaseClient` singleton is created at app startup and injected into the SwiftUI environment. An `AuthViewModel` at the root switches the view tree between the auth flow and the main tab view.

**State management:** `@Observable` (iOS 17) ViewModels — one per screen plus a shared `AuthViewModel`. All data operations use `async/await` via the supabase-swift SDK.

**Dependencies:** one — `supabase-swift` (github.com/supabase/supabase-swift) via Xcode SPM. No other third-party dependencies.

**Minimum deployment target:** iOS 17.0

## File Structure

```
moodtracker+/
  App/
    moodtracker_App.swift       // @main, creates Supabase client, hosts AuthViewModel
    SupabaseClient.swift        // singleton, reads keys from Info.plist
  Models/
    DailyLog.swift              // mirrors DB schema, Codable
  ViewModels/
    AuthViewModel.swift         // session state, sign in/up/out, password reset
    TodayViewModel.swift        // fetch + save for a given date, yesterday pre-fill
    HistoryViewModel.swift      // last 90 days, newest-first
    ChartsViewModel.swift       // 7/30/90-day range, oldest-first
  Views/
    Auth/
      AuthView.swift            // root auth router
      SignInView.swift
      SignUpView.swift
      ForgotPasswordView.swift
    Today/
      TodayView.swift
      MoodSection.swift
      FoodSection.swift
      ExerciseSection.swift
      SleepSection.swift
      GratitudeSection.swift
    History/
      HistoryView.swift
      HistoryEntryView.swift
    Charts/
      ChartsView.swift
      MoodChartView.swift
      SleepChartView.swift
      MealsChartView.swift
      ExerciseChartView.swift
    Shared/
      LabeledSlider.swift
  Utilities/
    SleepCalculator.swift
```

## Data Layer

### DailyLog Model

`Codable` struct with `snake_case` `CodingKeys` matching the DB columns exactly. `date` is `String` (`"YYYY-MM-DD"`). Time fields (`bedtime`, `wake_time`, `tonight_bedtime`) are `String?` (`"HH:MM:SS"`). All measurement fields are optional.

### SupabaseClient

Single `SupabaseClient` instance. Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `Bundle.main.infoDictionary` (populated from `Secrets.xcconfig` via `Info.plist`). Crashes with a descriptive message if either key is missing.

### ViewModels

- **`AuthViewModel`** — listens to `supabase.auth.authStateChanges` async stream on init. Holds `session: Session?` and `isPasswordRecovery: Bool`. Methods: `signIn(email:password:)`, `signUp(email:password:)`, `signOut()`, `sendPasswordReset(email:)`, `updatePassword(_:)`, `signInWithApple()` (stub, disabled — requires Apple Developer account).
- **`TodayViewModel(date:)`** — fetches the log for `date` and `date - 1 day` in parallel. Exposes `save(_ values:)` which upserts via insert-or-update. Pre-fills `bedtime` from yesterday's `tonight_bedtime` if today's `bedtime` is nil.
- **`HistoryViewModel`** — fetches last 90 days on init, newest-first.
- **`ChartsViewModel`** — fetches a date range based on `rangeDays` (7/30/90). Exposes `chronologicalLogs` (oldest-first) for chart rendering.

### SleepCalculator

Pure function `sleepHours(bedtime: String, wakeTime: String) -> Double?`. Parses `HH:MM` strings, handles overnight crossings (bedtime > wake time adds 24 hours). Direct port of `src/lib/sleep.ts`.

## Auth Flow

`AuthView` is shown when `session == nil` (or `isPasswordRecovery == true`). It owns a `@State enum Mode { signIn, signUp, forgotPassword }` and renders the appropriate sub-view.

- **SignInView** — email + password, "Sign In" button, links to sign-up and forgot password.
- **SignUpView** — email + password + confirm password. On success shows inline "Check your email" notice without navigating away.
- **ForgotPasswordView** — email field, shows confirmation text on success.
- **ResetPasswordView** — shown when `isPasswordRecovery == true`. New password + confirm, calls `supabase.auth.update(user:)`. Clears recovery state on success.
- **Apple Sign In** — disabled button in `SignInView` with a `// TODO: requires Apple Developer account` stub in `AuthViewModel`.

**Deep linking:** `moodtracker://` URL scheme registered in `Info.plist`. Supabase redirect URLs point to `moodtracker://login-callback`. `moodtracker_App` handles `onOpenURL` and calls `supabase.auth.session(from:)`.

**Sign Out** — accessible from a button in the tab bar navigation header.

## Screens

### Today (`TodayView`)

`ScrollView` with a `VStack` of sections separated by `Divider()`. Heading shows "Today" for the current date or the formatted date string otherwise. "Save" button at the bottom calls `viewModel.save()`; shows "Saved ✓" for ~2 seconds after success. Navigated to from `HistoryView` for past dates.

**Sections:**
- **MoodSection** — three `LabeledSlider` rows: Mood, Energy, Anxiety (each 1–10)
- **FoodSection** — +/− stepper buttons for `meals_count` (0–10)
- **ExerciseSection** — `Toggle` for `exercised`
- **SleepSection** — two sub-sections:
  - *Last night's sleep:* wake time `DatePicker` (`.hourAndMinute`), sleep quality `LabeledSlider` (1–5)
  - *Tonight:* tonight's bedtime `DatePicker` (`.hourAndMinute`)
  - Bedtime lives in ViewModel state (pre-filled from yesterday, used to calculate `sleep_hours`) but is not displayed
- **GratitudeSection** — multiline `TextEditor` with label

**`LabeledSlider`** — label on left, `Slider` in middle, integer value on right. Configurable range.

### History (`HistoryView`)

`List` of `HistoryEntryView` rows, 90 days newest-first. Each row shows: date, mood/energy/anxiety ratings, sleep hours, meals count, exercise status, truncated gratitude quote. Tapping navigates to `TodayView(date: log.date)` via `NavigationLink`.

### Charts (`ChartsView`)

`ScrollView` with a `VStack` of four chart cards. Segmented `Picker` (`.pickerStyle(.segmented)`) at the top for 7 / 30 / 90 day range. Each chart is a rounded card with a title and chart below.

**Charts:**
- **MoodChartView** — three `LineMark` series (Mood, Energy, Anxiety) on a 1–10 Y axis. `.foregroundStyle(by:)` for automatic legend and color. Nil values handled by filtering per series.
- **SleepChartView** — two `LineMark` series: Hours (0–12) and Quality (1–5). Quality values are scaled to the Hours axis (×12/5) for display; legend clarifies the actual scales.
- **MealsChartView** — `BarMark` with meals count on Y axis.
- **ExerciseChartView** — `BarMark` height 1 per day; blue for exercised, gray for not.

All charts use `chartXAxis` with `MM/dd` date labels. Consistent card padding and corner radius across all four.

## Configuration & Secrets

**`Secrets.xcconfig`** (gitignored) — defines `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Referenced in Debug and Release build configurations. Values forwarded into `Info.plist`.

**`Secrets.xcconfig.example`** (committed) — documents required keys.

**Supabase redirect URL** — set to `moodtracker://login-callback` in the Supabase project's auth settings.

## Out of Scope

- iPad layout
- macOS (Catalyst or native)
- Apple Sign In (requires Apple Developer account — stub only)
- Google OAuth
- Push notifications
- Offline/local caching
- History display of `tonight_bedtime`
- Charts for `tonight_bedtime`
