# Mood Tracker Plus

A daily mood and wellness tracker designed for people managing bipolar disorder. Log how you're feeling, track sleep and habits, and spot patterns over time.

**Live app:** [moodtrackerplus.vercel.app](https://moodtrackerplus.vercel.app)

## Features

- **Daily logging** — rate mood, energy, and anxiety on a 1–10 scale
- **Sleep tracking** — log bedtime, wake time, hours slept, and sleep quality
- **Food & exercise** — track meals eaten and whether you exercised
- **History** — browse all past daily logs
- **Charts** — visualize trends in mood, sleep, meals, and exercise over time
- **PWA** — installable on mobile as a native-feeling app
- **Authentication** — email/password and Google sign-in via Supabase Auth

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Charts:** Recharts
- **Backend & auth:** Supabase (Postgres + Row Level Security)
- **Deployment:** Vercel

## Getting Started

**Prerequisites:** Node.js 20+, a [Supabase](https://supabase.com) project

```bash
git clone https://github.com/your-username/bipolarmoodtracker.git
cd bipolarmoodtracker
npm install
```

Create a `.env.local` file with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
```

## Running Tests

```bash
npm test
```
