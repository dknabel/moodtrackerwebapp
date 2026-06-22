# Dark Mode — Main App Pages Design Spec

**Date:** 2026-06-22
**Status:** Approved

## Overview

Extend dark mode styling to the main app pages (Today, History, Charts). The `useTheme` hook and Tailwind `@custom-variant dark` are already in place from the prior dark mode spec. This spec covers the remaining 14 components.

## Approach

Option B: CSS `dark:` class additions for Today and History components; `isDark` prop threading from `ChartsPage` into the 4 chart components to handle Recharts' inline SVG color props which cannot be styled via CSS classes.

## Architecture

No structural changes. `ChartsPage` gains one `useTheme()` call and passes `isDark: boolean` to each chart component. All other changes are additive Tailwind class additions only.

## Component Changes

### Today Page

**`TodayPage`**
- Loading div: add `dark:text-gray-500`
- `<h1>`: `text-gray-900` → add `dark:text-white`
- `<hr>` dividers (×4): `border-gray-200` → add `dark:border-gray-700`

**`Slider`**
- Label span: `text-gray-700` → add `dark:text-gray-300`
- Value span: `text-blue-600` — unchanged (readable on dark)

**`FoodSection`**
- `<h2>`: `text-gray-900` → add `dark:text-white`
- "Meals today" span: `text-gray-600` → add `dark:text-gray-400`
- `−` and `+` buttons: `border-gray-300 text-gray-700` → add `dark:border-gray-600 dark:text-gray-300`

**`ExerciseSection`**
- `<h2>`: `text-gray-900` → add `dark:text-white`
- Label span: `text-gray-700` → add `dark:text-gray-300`

**`SleepSection`**
- `<h2>`: `text-gray-900` → add `dark:text-white`
- Context label `<p>`: `text-gray-500` → add `dark:text-gray-400`
- Field `<label>` elements: `text-gray-600` → add `dark:text-gray-400`
- Bedtime and wake time `<input>`: `border-gray-300` → add `dark:border-gray-600 dark:bg-gray-800 dark:text-white`
- Sleep hours `<input>`: same as above

**`GratitudeSection`**
- `<label>`: `text-gray-900` → add `dark:text-white`
- `<textarea>`: `border-gray-200 text-gray-700` → add `dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400`

**`MoodSection`** — no changes (delegates entirely to Slider)

### History Page

**`HistoryPage`**
- Loading/error/empty state divs: `text-gray-400` → add `dark:text-gray-500`
- `<h1>`: `text-gray-900` → add `dark:text-white`

**`HistoryEntry`**
- Card button: `bg-white border-gray-100` → add `dark:bg-gray-800 dark:border-gray-700`
- Date span: `text-gray-900` → add `dark:text-white`
- Stats div: `text-gray-500` → add `dark:text-gray-400`
- Blockquote: `text-gray-500` → add `dark:text-gray-400`

### Charts Page

**`ChartsPage`**
- Add `import { useTheme } from '../../hooks/useTheme'` and `const { isDark } = useTheme()`
- Pass `isDark={isDark}` to `MoodChart`, `SleepChart`, `MealsChart`, `ExerciseChart`
- `<h1>`: `text-gray-900` → add `dark:text-white`
- Range picker container: `bg-gray-100` → add `dark:bg-gray-800`
- Active range button: `bg-white text-blue-600` → add `dark:bg-gray-700`
- Inactive range button: `text-gray-500` → add `dark:text-gray-400`
- Loading/empty divs: `text-gray-400` → add `dark:text-gray-500`

**`MoodChart`, `SleepChart`, `MealsChart`, `ExerciseChart`** — all four follow the same pattern:
- Add `isDark?: boolean` to props interface
- Card div: `bg-white border-gray-100` → add `dark:bg-gray-800 dark:border-gray-700`
- `<h2>`: `text-gray-700` → add `dark:text-gray-300`
- `CartesianGrid stroke`: `isDark ? '#374151' : '#f0f0f0'` (gray-700 in dark, near-white in light)
- `XAxis tick fill`: `isDark ? '#9ca3af' : '#666'` (gray-400 in dark, default gray in light)
- `YAxis tick fill`: same as XAxis
- `ExerciseChart` span: `text-gray-500` → add `dark:text-gray-400`

Bar/line colors (`#2563eb`, `#16a34a`, `#dc2626`, `#7c3aed`, `#0891b2`, `#f59e0b`) — unchanged, all have adequate contrast on dark backgrounds.

`ExerciseChart` inactive bar `Cell` fill: `#e5e7eb` (gray-200) → `isDark ? '#4b5563' : '#e5e7eb'` (gray-600 in dark, avoids near-invisible light bars on dark bg).

## Out of Scope

- Recharts Tooltip dark styling (minor visual artifact, acceptable)
- Recharts Legend text color
