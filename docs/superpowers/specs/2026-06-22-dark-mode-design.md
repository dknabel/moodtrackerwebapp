# Dark Mode Toggle — Design Spec

**Date:** 2026-06-22
**Status:** Approved

## Overview

Add a user-controlled dark mode toggle to the Bipolar Mood Tracker PWA. The toggle lives in the `AppShell` header alongside the existing Sign Out button. The preference is persisted in `localStorage` and falls back to the OS system preference when no explicit choice has been saved.

## Approach

Option A: `useTheme` hook + Tailwind CSS v4 `dark:` class variant. No React context. The hook is called only in `AppShell`.

## Architecture

### `src/hooks/useTheme.ts`

Single hook that owns all theme state and side effects:

1. **Initial value resolution** (runs once on mount):
   - Read `localStorage.getItem('theme')`.
   - If `'light'` or `'dark'`, use it.
   - Otherwise read `window.matchMedia('(prefers-color-scheme: dark)').matches`.

2. **DOM application**: Toggle the `dark` class on `document.documentElement` whenever the resolved value changes.

3. **OS change listener**: Register `addEventListener('change', ...)` on the `prefers-color-scheme` media query. Only fires when the user has no explicit preference in `localStorage`; if they do, OS changes are ignored.

4. **Public API**: `{ isDark: boolean, toggle: () => void }`. `toggle` flips the value and writes `'light'` or `'dark'` to `localStorage`.

### `src/components/layout/AppShell.tsx`

Calls `useTheme()`. Renders an icon-only button in the header:
- Shows `☀️` when dark (clicking switches to light)
- Shows `🌙` when light (clicking switches to dark)

Sits to the left of the existing Sign Out button.

### `src/index.css`

Add one line to enable Tailwind's class-based dark variant:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

## Dark Mode Color Pass

Components that need `dark:` class additions:

| Component | Current classes | Add dark: classes |
|---|---|---|
| `AppShell` | `bg-gray-50` | `dark:bg-gray-900` |
| `AppShell` header text/buttons | `text-gray-400 hover:text-gray-600` | `dark:text-gray-500 dark:hover:text-gray-300` |
| `BottomNav` | `bg-white border-gray-200` | `dark:bg-gray-900 dark:border-gray-700` |
| `BottomNav` inactive links | `text-gray-500` | `dark:text-gray-400` |
| `App.tsx` loading div | `text-gray-400` | `dark:text-gray-500` |
| `AuthPage` and auth forms | backgrounds, inputs, labels, borders | appropriate dark: variants |

Chart colors (Recharts inline props) are out of scope — they do not respond to CSS `dark:` variants and are unchanged.

## Out of Scope

- Per-chart dark palette (requires Option B / React context)
- Settings page or settings tab
- Server-side persistence of theme preference
