# Mood Tracker+

A daily mood and wellness tracker. Log how you're feeling, track sleep and habits, and spot patterns over time.

**Live app:** [moodtracker.plus](https://moodtracker.plus/)

## Features

- **Daily logging with custom fields** — track anything with sliders, numbers, yes/no toggles, text notes, and tags; reorder, archive, and chart fields as you like
- **Autosave** — entries save automatically as you type, no Save button to remember
- **Sleep tracking** — wake time, sleep quality, and tonight's planned bedtime, with hours calculated for you
- **Medications** — manage your med list and check off daily doses
- **Reminders** — schedule daily check-in and medication notifications on the iOS/Android app
- **Day navigation** — step back through past days or jump to any date to backfill an entry
- **History** — browse past logs and export them to CSV or PDF
- **Charts** — trends, overlays, correlations, and streaks across any tracked field
- **Dark mode** — follows your preference, with a manual toggle
- **PWA** — installable on mobile as a native-feeling app
- **iOS & Android apps** — native wrapper (Capacitor) with local notifications and native Google sign-in
- **Authentication** — email/password and Google sign-in via Supabase Auth

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Charts:** Recharts
- **Native wrapper:** Capacitor (iOS + Android)
- **Backend & auth:** Supabase (Postgres + Row Level Security)
- **Deployment:** Vercel
