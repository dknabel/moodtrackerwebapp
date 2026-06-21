# Bipolar Mood Tracker — Design Spec

**Date:** 2026-06-20
**Status:** Approved

## Overview

A mobile-first personal health webapp for tracking daily mood, food, exercise, and sleep — designed for managing bipolar disorder and other mental health conditions. Data syncs to a backend so it is accessible across sessions.

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS (mobile-first) |
| PWA | Installable on phone home screen |
| Backend / Auth / DB | Supabase (PostgreSQL + magic link auth + RLS) |
| Charts | Recharts |
| Frontend hosting | Vercel |
| Backend hosting | Supabase cloud (free tier) |

Row-level security (RLS) on Supabase ensures each user can only read and write their own data.

---

## Data Model

### `daily_logs`

One row per user per day. The `(user_id, date)` pair is unique.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | References Supabase auth user |
| `date` | date | The calendar day being logged |
| `mood_rating` | int (1–10) | Overall mood |
| `mood_energy` | int (1–10) | Energy level |
| `mood_anxiety` | int (1–10) | Anxiety level |
| `meals_count` | int | Number of meals eaten |
| `exercised` | boolean | Whether the user exercised |
| `sleep_hours` | decimal | Hours slept; auto-calculated from bedtime/wake_time when both are provided, otherwise entered manually |
| `sleep_quality` | int (1–5) | Subjective sleep quality |
| `bedtime` | time | Time the user went to bed |
| `wake_time` | time | Time the user woke up |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last update time |

---

## Pages & Navigation

Bottom tab bar with three tabs (phone-friendly):

### Today
- Default landing page after login.
- Shows today's date.
- Form sections:
  - **Mood:** Three sliders (1–10) for overall mood, energy, and anxiety.
  - **Food:** A number input or stepper for meals count.
  - **Exercise:** A single checkbox or toggle (did / didn't).
  - **Sleep:** Bedtime picker, wake time picker, sleep hours (auto-calculated or manual), sleep quality slider (1–5).
- A "Save" button persists the entry. If a log already exists for today, the form pre-populates with existing values and saving updates the row.

### History
- Scrollable list of past log entries, newest first.
- Each entry shows a one-line summary: date, mood/energy/anxiety ratings, sleep hours, exercise indicator.
- Tapping an entry opens it in an edit view (same form as Today but for that date).

### Charts
- Time range selector: 7 days / 30 days / 90 days.
- Separate line charts for:
  - Mood dimensions: mood rating, energy, anxiety (three lines on one chart)
  - Sleep: hours slept and quality (two lines on one chart)
  - Meals: meals per day (bar or line)
  - Exercise: frequency (bar showing exercise days vs. total days in range)

---

## Auth Flow

1. Unauthenticated users land on a login screen: enter email, tap "Send link."
2. Supabase sends a magic link to the email address.
3. Clicking the link authenticates the user and redirects to the Today page.
4. The session persists on the device; no repeated logins unless the user signs out or clears the browser.
5. A "Sign out" option is available in a settings or profile menu (not prominent).

---

## Error Handling

- If saving a log fails, show an inline error message and keep the form populated so data is not lost.
- If the magic link email fails to send, show a retry prompt.
- Charts with no data in the selected range show an empty state message ("No entries yet for this period").

---

## Out of Scope

- Medication tracking
- Notes / free-text journal entries
- Social or sharing features
- Notifications / reminders
- Multiple users / caregiver access
