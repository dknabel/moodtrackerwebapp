# "The Journal" UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire app (web + PWA + Capacitor iOS/Android, one React codebase) with the warm editorial "Journal" identity from the approved spec.

**Architecture:** All colors/fonts live as Tailwind 4 `@theme inline` tokens backed by CSS custom properties that flip under `.dark`, so components use semantic classes (`bg-bg`, `text-ink`, `border-line`) with **no `dark:` color variants**. Screens are rebuilt section by section; no route, data, or logic changes.

**Tech Stack:** React 19, Tailwind CSS 4 (`@tailwindcss/vite`), Recharts, Vitest + RTL, @fontsource variable fonts.

**Spec:** `docs/superpowers/specs/2026-07-24-journal-ui-redesign-design.md`

## Global Constraints

- Light palette: bg `#FAF9F6`, surface `#FFFFFF`, ink `#1B1916`, muted `#6B6359`, faint `#9C9388`, line `#E6DFD3`, clay `#E5604A`, clay-deep `#C8472F`, clay-tint `#FBE7E0`.
- Dark palette: warm near-black `#1B1916` base, same terracotta accent. Never blue-grays.
- Fonts self-hosted via npm `@fontsource-variable/*` (no runtime Google Fonts). Fraunces = display serif; Geist = UI sans; Geist Mono = eyebrow labels.
- No pure black text; never default Tailwind blue anywhere after Task 2.
- No route, data, or Supabase changes. Capacitor sync / Vercel deploy untouched.
- Existing Vitest/RTL suite must stay green; `npm run test`, `npm run lint`, `npm run build` must pass at every task boundary.
- Preserve iOS safe-area insets, the iOS anti-zoom input fix, and `prefers-reduced-motion`.

---

### Task 1: Design tokens, fonts, and shared class helpers

**Files:**
- Modify: `src/index.css` (full rewrite, 2 lines → below)
- Modify: `src/lib/styles.ts` (full rewrite, 2 lines → below)
- Modify: `package.json` (new deps)
- Test: `src/lib/styles.test.ts` (create)

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces:
  - Tailwind utilities: `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `text-faint`, `border-line`, `text-clay`, `bg-clay`, `bg-clay-deep`, `bg-clay-tint`, `text-danger`, `font-serif`, `font-sans`, `font-mono`
  - `focusRing` (ring-clay), `btnPrimary`, `btnSecondary`, `linkText`, `eyebrow` from `src/lib/styles.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/styles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { focusRing, btnPrimary, btnSecondary, linkText, eyebrow } from './styles'

describe('style helpers', () => {
  it('uses clay tokens, never blue', () => {
    for (const cls of [focusRing, btnPrimary, btnSecondary, linkText, eyebrow]) {
      expect(cls).not.toMatch(/blue|gray/)
    }
    expect(focusRing).toContain('ring-clay')
    expect(btnPrimary).toContain('bg-clay')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styles.test.ts`
Expected: FAIL — `btnPrimary is not exported` / focusRing contains `blue`.

- [ ] **Step 3: Install fonts**

Run: `npm install @fontsource-variable/fraunces @fontsource-variable/geist @fontsource-variable/geist-mono`

- [ ] **Step 4: Write minimal implementation**

Replace `src/lib/styles.ts` entirely:

```ts
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay'

export const btnPrimary =
  'bg-clay text-white rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 hover:bg-clay-deep disabled:opacity-50 disabled:hover:translate-y-0'

export const btnSecondary =
  'border border-line text-ink rounded-full px-4 py-2 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50'

export const linkText = 'text-clay font-medium'

export const eyebrow =
  'font-mono text-[11px] uppercase tracking-[0.08em] text-faint'
```

Replace `src/index.css` entirely:

```css
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/fraunces/wght-italic.css';
@import '@fontsource-variable/geist';
@import '@fontsource-variable/geist-mono';
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg: #FAF9F6;
  --surface: #FFFFFF;
  --ink: #1B1916;
  --muted: #6B6359;
  --faint: #9C9388;
  --line: #E6DFD3;
  --clay: #E5604A;
  --clay-deep: #C8472F;
  --clay-tint: #FBE7E0;
  --danger: #B3402F;
}

.dark {
  --bg: #1B1916;
  --surface: #26211B;
  --ink: #F2EDE6;
  --muted: #A89F92;
  --faint: #7C7468;
  --line: #3A342B;
  --clay: #E5604A;
  --clay-deep: #EC7B66;
  --clay-tint: #3A2621;
  --danger: #E0705F;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-line: var(--line);
  --color-clay: var(--clay);
  --color-clay-deep: var(--clay-deep);
  --color-clay-tint: var(--clay-tint);
  --color-danger: var(--danger);
  --font-serif: 'Fraunces Variable', Georgia, 'Times New Roman', serif;
  --font-sans: 'Geist Variable', -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'Geist Mono Variable', ui-monospace, 'SF Mono', monospace;
}

@layer base {
  body {
    background-color: var(--bg);
    color: var(--ink);
    font-family: var(--font-sans);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/styles.test.ts`
Expected: PASS

- [ ] **Step 6: Verify the whole suite and build still work**

Run: `npm run test && npm run build`
Expected: all existing tests PASS (none assert on blue classes — they query by role/label), build succeeds. If any test asserted an old class, update the assertion to the new token class.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/index.css src/lib/styles.ts src/lib/styles.test.ts
git commit -m "feat: add journal design tokens, fonts, and style helpers"
```

---

### Task 2: Section primitive + restyle ui/ components

**Files:**
- Create: `src/components/ui/Section.tsx`
- Test: `src/components/ui/Section.test.tsx` (create)
- Modify: `src/components/ui/Slider.tsx`, `src/components/ui/Stepper.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/Card.tsx`
- Test: `src/components/ui/ConfirmDialog.test.tsx` (keep green; update only if it asserts classes)

**Interfaces:**
- Consumes: tokens + helpers from Task 1.
- Produces: `<Section title eyebrow? className?>` used by Today/History/Reminders tasks; restyled `Slider`, `Stepper`, `Skeleton`, `ConfirmDialog`. `Card` becomes a thin alias kept only until Task 4 removes its last uses.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/Section.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Section } from './Section'

describe('Section', () => {
  it('renders an uppercase mono eyebrow label and children', () => {
    render(<Section title="Sleep"><p>content</p></Section>)
    const heading = screen.getByRole('heading', { name: 'Sleep' })
    expect(heading.className).toContain('font-mono')
    expect(heading.className).toContain('uppercase')
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders without a card box (no surface background)', () => {
    const { container } = render(<Section title="Mood"><p>x</p></Section>)
    expect(container.firstElementChild!.className).not.toMatch(/bg-surface|rounded-xl|shadow/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/Section.test.tsx`
Expected: FAIL — cannot find module `./Section`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/ui/Section.tsx`:

```tsx
import type { ReactNode } from 'react'
import { eyebrow } from '../../lib/styles'

interface SectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ title, action, children, className = '' }: SectionProps) {
  return (
    <section className={`flex flex-col gap-3 pt-4 border-t border-line first:border-t-0 first:pt-0 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className={eyebrow}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
```

Restyle `src/components/ui/Slider.tsx` — replace these exact strings:
- `className="text-gray-700 dark:text-gray-300"` → `className="text-sm text-ink"`
- `className="font-semibold text-blue-600 dark:text-blue-400"` → `className="font-serif text-lg text-clay"`
- `className="w-full accent-blue-600 h-2 cursor-pointer"` → `className="w-full accent-clay h-2 cursor-pointer"`
- `className="flex justify-between text-xs text-gray-400 dark:text-gray-500"` → `className="flex justify-between text-xs text-faint"`

Restyle `src/components/ui/Stepper.tsx` — replace both button class strings
`className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40"` and the identical one without `disabled:opacity-40` →
`className="w-9 h-9 rounded-full border border-line text-lg font-medium text-ink transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-40"`;
and `className="text-xl font-semibold w-6 text-center dark:text-white"` → `className="font-serif text-xl w-6 text-center text-ink"`;
and `className="text-sm text-gray-500 dark:text-gray-400"` → `className="text-sm text-faint"`.

Restyle `src/components/ui/Skeleton.tsx` — replace `animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700` → `animate-pulse rounded-xl bg-clay-tint`.

Restyle `src/components/ui/ConfirmDialog.tsx` — replace these exact strings:
- `bg-black/50` → `bg-ink/40`
- `bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-lg` → `bg-surface rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-[0_20px_48px_rgba(27,25,22,0.12)]`
- `text-base font-semibold text-gray-900 dark:text-white` → `font-serif text-lg text-ink`
- `text-sm text-gray-600 dark:text-gray-300` → `text-sm text-muted`
- Cancel button `flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm font-medium text-gray-700 dark:text-gray-300` → `flex-1 ${btnSecondary}` (import `btnSecondary` from `../../lib/styles`)
- Confirm button `flex-1 bg-red-600 text-white rounded-lg p-2 text-sm font-medium` → `flex-1 bg-danger text-white rounded-full p-2 text-sm font-medium`

Reduce `src/components/ui/Card.tsx` to a legacy alias (TodayPage stops using it in Task 4; delete the file in Task 4):

```tsx
import type { ReactNode } from 'react'

/** @deprecated Use Section for flat editorial layout. Kept until Task 4 removes the last uses. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface rounded-xl p-4 border border-line ${className}`}>{children}</div>
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS (Section tests + full existing suite, incl. `ConfirmDialog.test.tsx`, `Slider`/`Stepper` consumers' tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat: add Section primitive and restyle shared UI components"
```

---

### Task 3: App shell — header wordmark + bottom nav

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Test: `src/components/layout/BottomNav.test.tsx` (create)

**Interfaces:**
- Consumes: tokens, `focusRing` from Task 1.
- Produces: final shell used by every screen task after this.

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/BottomNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('renders all four tabs with mono uppercase labels', () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>)
    for (const label of ['Today', 'History', 'Charts', 'Reminders']) {
      const link = screen.getByRole('link', { name: label })
      expect(link.className).toContain('font-mono')
      expect(link.className).toContain('uppercase')
    }
  })

  it('marks the active tab with clay, not blue', () => {
    render(<MemoryRouter initialEntries={['/']}><BottomNav /></MemoryRouter>)
    const today = screen.getByRole('link', { name: 'Today' })
    expect(today.className).toContain('text-clay')
    expect(today.className).not.toMatch(/blue/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/BottomNav.test.tsx`
Expected: FAIL — current classes are `text-blue-600`, no `font-mono`.

- [ ] **Step 3: Write minimal implementation**

In `src/components/layout/BottomNav.tsx`, replace the whole `className` callback body with:

```tsx
className={({ isActive }) =>
  `flex-1 flex flex-col items-center py-2.5 gap-1 font-mono text-[10px] uppercase tracking-[0.08em] ${focusRing} ${
    isActive ? 'text-clay' : 'text-faint'
  }`
}
```

Replace `<Icon className="w-6 h-6" strokeWidth={2} />` with `<Icon className="w-5 h-5" strokeWidth={1.5} />`, and the nav element's classes `bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700` with `bg-surface border-t border-line`.

In `src/components/layout/AppShell.tsx`:
- Root div: `min-h-screen bg-gray-50 dark:bg-gray-900 pb-[calc(5rem+env(safe-area-inset-bottom))]` → `min-h-screen bg-bg pb-[calc(5rem+env(safe-area-inset-bottom))]`
- Brand span → serif wordmark with italic clay accent:

```tsx
<span className="font-serif text-xl text-ink tracking-[-0.02em]">
  Mood <em className="italic text-clay">Tracker</em>
</span>
```

- Theme toggle button classes `p-2 -m-1 text-gray-500 dark:text-gray-400 rounded-lg` → `p-2 -m-1 text-faint rounded-lg`
- Sign out button classes `p-2 -m-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg` → `p-2 -m-1 text-xs text-faint hover:text-muted rounded-lg`
- Widen the journal measure: `max-w-lg` → `max-w-[680px]` on both header and main.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout
git commit -m "feat: restyle app shell with journal wordmark and bottom nav"
```

---

### Task 4: Today page — journal-page composition

**Files:**
- Create: `src/lib/greeting.ts`
- Test: `src/lib/greeting.test.ts` (create)
- Modify: `src/components/today/TodayPage.tsx`
- Delete: `src/components/ui/Card.tsx` (last uses removed here)
- Test: `src/components/today/TodayPage.test.tsx` (keep green; it queries by role/label — update only if it asserted classes or the old heading level)

**Interfaces:**
- Consumes: `Section`, `eyebrow`, `focusRing`, `linkText` from Tasks 1–2.
- Produces: `greeting(date: Date): string` returning e.g. `'morning' | 'afternoon' | 'evening'`. TodayPage renders date as large serif page header.

- [ ] **Step 1: Write the failing test**

Create `src/lib/greeting.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { greeting } from './greeting'

describe('greeting', () => {
  it('returns morning before noon, afternoon before 18, evening after', () => {
    expect(greeting(new Date('2026-07-24T08:00:00'))).toBe('morning')
    expect(greeting(new Date('2026-07-24T14:00:00'))).toBe('afternoon')
    expect(greeting(new Date('2026-07-24T21:00:00'))).toBe('evening')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/greeting.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/greeting.ts`:

```ts
export function greeting(now: Date): 'morning' | 'afternoon' | 'evening' {
  const h = now.getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
```

In `src/components/today/TodayPage.tsx`:

1. Remove `import { Card } from '../ui/Card'`; add `import { Section } from '../ui/Section'`, `import { greeting } from '../../lib/greeting'`, and change the styles import to `import { focusRing, linkText } from '../../lib/styles'`.
2. Replace the header row (the outer `<div className="flex justify-between items-center">` and its contents, lines 214–266) with:

```tsx
<div className="flex flex-col gap-1">
  <div className="flex items-center justify-between">
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => goTo(prevDay)}
        aria-label="Previous day"
        className={`p-2 -ml-2 text-faint rounded-lg ${focusRing}`}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
      </button>
      <div className="relative rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay">
        <h1 className="font-serif text-3xl tracking-[-0.025em] text-ink whitespace-nowrap">
          {formatDay(date)}
        </h1>
        <input
          type="date"
          aria-label="Choose date"
          value={date}
          max={todayStr()}
          onChange={e => { if (e.target.value) goTo(e.target.value) }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <button
        type="button"
        onClick={() => goTo(nextDay)}
        aria-label="Next day"
        disabled={isToday}
        className={`p-2 text-faint disabled:opacity-30 rounded-lg ${focusRing}`}
      >
        <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
      </button>
      {!isToday && (
        <button
          type="button"
          onClick={() => goTo(todayStr())}
          className={`text-sm ${linkText} rounded-lg ${focusRing}`}
        >
          Today
        </button>
      )}
    </div>
    <div className="flex items-center gap-3">
      <SaveStatus status={status} error={saveError} onRetry={runSave} />
      <button
        type="button"
        onClick={onManageFields}
        className={`text-sm ${linkText} rounded-lg ${focusRing}`}
      >
        Manage fields
      </button>
    </div>
  </div>
  {isToday && (
    <p className="font-serif text-lg text-muted">
      Good <em className="italic text-clay">{greeting(new Date())}</em>.
    </p>
  )}
</div>
```

3. Replace `<Card>…<SleepSection …/></Card>` with `<Section title="Sleep">…<SleepSection …/></Section>` (children unchanged).
4. Replace each `<Card key={field.id}>…<FieldSection …/></Card>` with `<Section key={field.id} title={field.name}>…</Section>`, keeping the `FieldSection` child unchanged.
5. Replace `<Card><MedsSection date={date} /></Card>` with `<Section title="Medications"><MedsSection date={date} /></Section>`.
6. In `SaveStatus`: `text-xs text-green-600 dark:text-green-400` → `text-xs text-muted`; `text-xs text-red-600 dark:text-red-400` → `text-xs text-danger`; `text-xs text-gray-400 dark:text-gray-500` → `text-xs text-faint`.
7. Load-error div: `text-center text-red-500 dark:text-red-400 mt-12` → `text-center text-danger mt-12`.
8. Delete `src/components/ui/Card.tsx` and remove the import (done in step 1).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS, including `greeting.test.ts` and `TodayPage.test.tsx`. If `TodayPage.test.tsx` referenced the deleted `Card` or old heading classes, update those assertions to the new structure.

- [ ] **Step 5: Commit**

```bash
git add src/lib/greeting.ts src/lib/greeting.test.ts src/components/today/TodayPage.tsx src/components/today/TodayPage.test.tsx src/components/ui/Card.tsx
git commit -m "feat: rebuild Today page as a journal page"
```

---

### Task 5: Today inputs — FieldSection, SleepSection, MedsSection

**Files:**
- Modify: `src/components/today/FieldSection.tsx`
- Modify: `src/components/today/SleepSection.tsx`
- Modify: `src/components/today/MedsSection.tsx`
- Test: existing `FieldSection.test.tsx`, `SleepSection.test.tsx`, `MedsSection.test.tsx` (keep green)

**Interfaces:**
- Consumes: tokens, `linkText`, restyled `Slider`/`Stepper` from Task 2. Note: field names now render in the parent `Section` eyebrow (Task 4), so in-section `<h2>` field-name headings are removed.
- Produces: final input styling for all field types.

- [ ] **Step 1: Update FieldSection**

In `src/components/today/FieldSection.tsx`, replace exactly:
- `case 'number'` and `case 'toggle'`: delete the `<h2 className="text-base font-semibold text-gray-900 dark:text-white">{field.name}</h2>` lines (title now lives in `Section`).
- `case 'toggle'` checkbox: `className="w-5 h-5 accent-blue-600 cursor-pointer"` → `className="w-5 h-5 accent-clay cursor-pointer"`; `<span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>` → `<span className="text-sm text-ink">Yes</span>`.
- `case 'text'`: replace the `<label …>{field.name}</label>` with nothing (title in `Section`), but move the `htmlFor` onto a visually hidden label to keep the accessible name — replace the label element with:

```tsx
<label htmlFor={`field-${field.id}`} className="sr-only">{field.name}</label>
```

  and textarea classes → `w-full rounded-lg border border-line bg-surface text-ink placeholder:text-faint p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay`.
- `case 'tags'`: delete the `<h2>…{field.name}</h2>`; tag button classes — replace the ternary branches:
  - selected: `'bg-clay text-white border-clay'`
  - unselected: `'border-line text-ink'`

- [ ] **Step 2: Update SleepSection**

In `src/components/today/SleepSection.tsx`:
- Delete the `<h2 …>Sleep</h2>` line (title now in `Section`).
- `inputClass` → `"border border-line bg-surface text-ink rounded-lg p-2 text-base"` (keep `text-base` — the iOS anti-zoom fix).
- Sub-headings `text-sm font-medium text-gray-700 dark:text-gray-300` → `text-sm font-medium text-ink`.
- Field labels `text-sm text-gray-600 dark:text-gray-400` → `text-sm text-muted`.

- [ ] **Step 3: Update MedsSection**

In `src/components/today/MedsSection.tsx`:
- Delete the `<h2 …>Medications</h2>`; keep the settings button but move it into the row's right side as before — replace the header `<div className="flex justify-between items-center">…</div>` with just the settings button aligned right:

```tsx
<div className="flex justify-end">
  <button
    onClick={() => setShowModal(true)}
    aria-label="Manage medications"
    className="text-faint hover:text-muted"
  >
    <Settings className="w-5 h-5" strokeWidth={1.5} />
  </button>
</div>
```

- `text-blue-600 dark:text-blue-400 underline` (Add yours) → `text-clay underline`.
- Checkbox `w-5 h-5 accent-blue-600 cursor-pointer` → `w-5 h-5 accent-clay cursor-pointer`.
- Med name span `text-sm text-gray-900 dark:text-white` → `text-sm text-ink`; add strikethrough when taken: ``className={`flex-1 text-sm text-ink ${taken ? 'line-through text-faint' : ''}`}`` (drop the now-redundant outer `text-sm text-ink` on the plain version).
- Time hint `text-xs text-gray-400 dark:text-gray-500 ml-1` → `text-xs text-faint ml-1`.
- Loading/empty hints `text-gray-400 dark:text-gray-500` / `text-gray-500 dark:text-gray-400` → `text-faint` / `text-muted`.
- Both error `<p>`s `text-red-500 dark:text-red-400` → `text-danger`.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS. `FieldSection.test.tsx`, `SleepSection.test.tsx`, `MedsSection.test.tsx` query by role/label and must stay green; if any asserted the removed `<h2>` headings, update those assertions to query the control directly.

- [ ] **Step 5: Commit**

```bash
git add src/components/today/FieldSection.tsx src/components/today/SleepSection.tsx src/components/today/MedsSection.tsx src/components/today/FieldSection.test.tsx src/components/today/SleepSection.test.tsx src/components/today/MedsSection.test.tsx
git commit -m "feat: restyle today inputs with journal tokens"
```

---

### Task 6: History → Journal

**Files:**
- Modify: `src/components/history/HistoryPage.tsx`
- Modify: `src/components/history/HistoryEntry.tsx`
- Test: `src/components/history/HistoryEntry.test.tsx` (keep green)

**Interfaces:**
- Consumes: tokens, `linkText`, `btnPrimary`, `Section`-style hairlines.
- Produces: journal-style entry list; export panel restyled.

- [ ] **Step 1: Restyle HistoryEntry**

In `src/components/history/HistoryEntry.tsx`, replace the button's class string with a flat journal row (no card):

```tsx
className="w-full text-left flex flex-col gap-1 py-4 border-b border-line"
```

- Date span → `font-serif text-lg tracking-[-0.02em] text-ink`
- Chips container `flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400` → `flex flex-wrap gap-3 text-xs text-muted`
- Blockquote `text-xs text-gray-500 dark:text-gray-400 italic mt-1` → `font-serif text-sm text-muted italic mt-1`

- [ ] **Step 2: Restyle HistoryPage**

In `src/components/history/HistoryPage.tsx`:
- Page heading `<h1 className="text-xl font-bold text-gray-900 dark:text-white">History</h1>` → `<h1 className="font-serif text-3xl tracking-[-0.025em] text-ink">Journal</h1>`
- Export button `text-sm text-blue-600 dark:text-blue-400 font-medium` → `text-sm ${linkText}` (import `linkText`).
- Export panel `bg-gray-50 dark:bg-gray-800 rounded-xl p-4` → `bg-surface border border-line rounded-xl p-4`.
- Panel sub-labels `text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide` → `font-mono text-[11px] uppercase tracking-[0.08em] text-faint`.
- Range/format option buttons: selected branch `'bg-blue-600 text-white border-blue-600'` → `'bg-clay text-white border-clay'`; unselected `'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'` → `'border-line text-ink'`.
- Export error `text-red-600 dark:text-red-400` → `text-danger`.
- Download button `w-full bg-blue-600 text-white rounded-lg p-2 text-sm font-medium disabled:opacity-50` → `w-full ${btnPrimary}` (import `btnPrimary`).
- Empty state: `text-center text-gray-400 dark:text-gray-500 mt-12` → `text-center text-faint mt-12`; first line → `<p className="font-serif text-lg text-muted">Nothing logged <em className="italic text-clay">yet</em>.</p>`.
- Load-error div `text-center text-red-500 dark:text-red-400 mt-12` → `text-center text-danger mt-12`.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS (`HistoryEntry.test.tsx` asserts rendered values, not classes).

- [ ] **Step 4: Commit**

```bash
git add src/components/history
git commit -m "feat: restyle history as journal entries"
```

---

### Task 7: Charts → Insights

**Files:**
- Create: `src/lib/chartColors.ts`
- Test: `src/lib/chartColors.test.ts` (create)
- Modify: `src/components/charts/ChartsPage.tsx`, `SleepChart.tsx`, `FieldChart.tsx`, `OverlaySection.tsx`, `CorrelationsSection.tsx`, `StatsSection.tsx`
- Test: `src/components/charts/FieldChart.test.tsx` (keep green)

**Interfaces:**
- Consumes: tokens, `linkText`.
- Produces: `CHART_COLORS` from `src/lib/chartColors.ts`:

```ts
export const CHART_COLORS = {
  series: ['#E5604A', '#716A4B', '#D9A441'] as const,
  grid: { light: '#EFEAE0', dark: '#3A342B' },
  tick: { light: '#9C9388', dark: '#A89F92' },
  barInactive: { light: '#E6DFD3', dark: '#3A342B' },
  barActive: '#E5604A',
  sleepHours: '#716A4B',
  sleepQuality: '#E5604A',
}
```

- [ ] **Step 1: Write the failing test**

Create `src/lib/chartColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CHART_COLORS } from './chartColors'

describe('CHART_COLORS', () => {
  it('uses the curated warm palette, never default blue', () => {
    const all = JSON.stringify(CHART_COLORS)
    expect(all).not.toMatch(/#2563eb|#16a34a|#7c3aed|#0891b2|#f59e0b/i)
    expect(CHART_COLORS.series[0]).toBe('#E5604A')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chartColors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/chartColors.ts` with the exact content shown in Interfaces above.

Then apply these exact replacements:

`SleepChart.tsx`:
- `const gridColor = isDark ? '#374151' : '#f0f0f0'` → `const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light`
- `const tickColor = isDark ? '#9ca3af' : '#666'` → `const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light`
- `stroke="#7c3aed"` → `stroke={CHART_COLORS.sleepHours}`; `stroke="#0891b2"` → `stroke={CHART_COLORS.sleepQuality}`
- Add `import { CHART_COLORS } from '../../lib/chartColors'`.

`FieldChart.tsx`:
- grid/tick lines: same two replacements as SleepChart.
- `className="bg-blue-600 h-4 rounded"` (toggle-legend swatch) → `className="h-4 rounded" style={{ backgroundColor: CHART_COLORS.barActive }}` — if it is a plain div, convert to span with inline style; keep layout classes.
- `const inactiveBarColor = isDark ? '#4b5563' : '#e5e7eb'` → `const inactiveBarColor = isDark ? CHART_COLORS.barInactive.dark : CHART_COLORS.barInactive.light`
- `fill={entry.value ? '#16a34a' : inactiveBarColor}` → `fill={entry.value ? CHART_COLORS.barActive : inactiveBarColor}`
- `stroke="#2563eb"` → `stroke={CHART_COLORS.series[0]}`
- Add the same import.

`OverlaySection.tsx`:
- `const COLORS = ['#2563eb', '#16a34a', '#f59e0b']` → `const COLORS = CHART_COLORS.series`
- grid/tick lines: same replacements.
- Field picker selected branch `'bg-blue-600 text-white border-blue-600'` → `'bg-clay text-white border-clay'`; unselected → `'border-line text-ink'`.
- Add the same import.

`CorrelationsSection.tsx`:
- `const tickColor = isDark ? '#9ca3af' : '#6b7280'` → `const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light`
- `const blue = '#2563eb'` → `const blue = CHART_COLORS.series[0]` (keep the local name to minimize diff)
- `const gray = isDark ? '#4b5563' : '#d1d5db'` → `const gray = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light`
- Add the same import.

`ChartsPage.tsx`:
- Heading → `<h1 className="font-serif text-3xl tracking-[-0.025em] text-ink">Insights</h1>`
- Range pill group `flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1` → `flex gap-1 bg-surface border border-line rounded-full p-1`
- Active pill `bg-white dark:bg-gray-700 text-blue-600 shadow-sm` → `bg-clay-tint text-clay`; inactive `text-gray-500 dark:text-gray-400` → `text-faint`
- Empty state `text-center text-gray-400 dark:text-gray-500 mt-8` → `text-center text-faint mt-8`

`StatsSection.tsx`:
- Replace any card wrapper classes `bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700` with `flex flex-col gap-1 py-4 border-b border-line`.
- Render each stat's numeric value with `font-serif text-3xl text-ink` and its label with `font-mono text-[11px] uppercase tracking-[0.08em] text-faint`. Replace any remaining `text-gray-*`/`dark:text-gray-*`/`dark:text-white` per the mapping: `900/white → text-ink`, `600/400 → text-muted`, `400|500/500 → text-faint`.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS, including `chartColors.test.ts` and `FieldChart.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chartColors.ts src/lib/chartColors.test.ts src/components/charts
git commit -m "feat: restyle charts as insights with warm palette"
```

---

### Task 8: Reminders, auth, and error boundary

**Files:**
- Modify: `src/components/reminders/RemindersPage.tsx`
- Modify: `src/components/auth/AuthPage.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `VerifyEmailNotice.tsx`, `AuthDivider.tsx` (only where gray/blue classes appear)
- Modify: `src/components/ErrorBoundary.tsx`
- Test: existing auth/reminders tests (keep green)

**Interfaces:**
- Consumes: tokens, `btnPrimary`, `btnSecondary`, `linkText`, `eyebrow`.
- Produces: nothing new — final surface coverage.

- [ ] **Step 1: RemindersPage replacements** (exact strings)

- `<h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reminders</h1>` → `<h1 className="font-serif text-3xl tracking-[-0.025em] text-ink">Reminders</h1>`
- Section `<h2 className="text-base font-semibold text-gray-900 dark:text-white">` (both) → `<h2 className={eyebrow}>` (import `eyebrow`).
- Row container `flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg` → `flex items-center gap-3 p-3 bg-surface border border-line rounded-lg` (both occurrences).
- All time/text inputs `border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white` → `border border-line bg-bg text-ink rounded p-2 text-sm` (all occurrences; add `disabled:opacity-50` where it already exists).
- Checkboxes `w-5 h-5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed` → `w-5 h-5 accent-clay cursor-pointer disabled:cursor-not-allowed` (both).
- Delete button `p-2 -m-1 text-red-500 dark:text-red-400 rounded-lg` → `p-2 -m-1 text-danger rounded-lg`.
- New-reminder dashed row `border border-dashed border-gray-300 dark:border-gray-600 rounded-lg` → `border border-dashed border-line rounded-lg`.
- Add button `bg-blue-600 text-white rounded p-2 text-sm font-medium ${focusRing}` → `${btnPrimary} ${focusRing}` (import `btnPrimary`).
- Med name `font-medium text-gray-900 dark:text-white text-sm` → `font-medium text-ink text-sm`; dose `text-xs text-gray-500 dark:text-gray-400` → `text-xs text-faint`.
- Footer note `text-xs text-gray-500 dark:text-gray-400` → `text-xs text-faint`.

- [ ] **Step 2: Auth screens replacements**

In every file under `src/components/auth/`, apply:
- Primary submit buttons `bg-blue-600 text-white rounded-lg p-3 font-medium …` → `${btnPrimary} w-full` (keep `disabled:opacity-50`; import `btnPrimary`).
- Links `text-blue-600` / `text-sm text-blue-600 …` → `${linkText}` (import `linkText`).
- `text-gray-900 dark:text-white` → `text-ink`; `text-gray-600 dark:text-gray-400` and `text-gray-500 dark:text-gray-400` → `text-muted`; `text-gray-400` → `text-faint`.
- Inputs `border-gray-300 dark:border-gray-600 … dark:bg-gray-800 dark:text-white` → `border-line bg-surface text-ink`; `focus:ring-blue-500`/`focus:ring-2 focus:ring-blue-500` → `focus:ring-2 focus:ring-clay`.
- Page headings → add `font-serif tracking-[-0.025em]`.
- Do NOT touch the Google "G" logo colors in `GoogleButton.tsx` (brand asset).

- [ ] **Step 3: ErrorBoundary**

In `src/components/ErrorBoundary.tsx`: button `bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium` → `${btnPrimary}` (import it); any `text-gray-*` → token equivalents per the same mapping.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS (auth + reminders suites query by role/label).

- [ ] **Step 5: Commit**

```bash
git add src/components/reminders src/components/auth src/components/ErrorBoundary.tsx
git commit -m "feat: restyle reminders, auth, and error boundary"
```

---

### Task 9: Final sweep and verification

**Files:**
- Modify: any file still containing legacy colors (found in Step 1)
- Modify: `src/components/today/ManageFieldsModal.tsx`, `src/components/today/ManageMedsModal.tsx` (token swaps only)

**Interfaces:**
- Consumes: everything above.
- Produces: zero legacy color classes in `src/`.

- [ ] **Step 1: Find remaining legacy colors**

Run: `grep -rn "gray-\|blue-\|red-\|green-" src --include='*.tsx' --include='*.ts' | grep -v test`
Expected: only the modal files and any stragglers. For each hit, apply the standard mapping: `gray-900/dark:white → text-ink`; `gray-700|600/dark:300|400 → text-muted`; `gray-400|500/dark:400|500 → text-faint`; `bg-white/dark:bg-gray-800 → bg-surface`; `bg-gray-50|100 → bg-bg or bg-surface (inset panels use bg-surface + border-line)`; `border-gray-* → border-line`; `bg-blue-600 → bg-clay`; `text-blue-600/dark:text-blue-400 → text-clay`; `accent-blue-600 → accent-clay`; `ring-blue-500 → ring-clay`; `text-red-* → text-danger`; `text-green-* → text-muted`.

For the two modals specifically, also: panel `bg-white dark:bg-gray-800 rounded-2xl … shadow-lg` → `bg-surface rounded-2xl shadow-[0_20px_48px_rgba(27,25,22,0.12)]`; modal `<h2>` titles → `font-serif text-lg text-ink`.

- [ ] **Step 2: Re-run the sweep until clean**

Run the same grep. Expected: no non-test hits except `GoogleButton.tsx` brand colors.

- [ ] **Step 3: Full verification**

Run: `npm run test && npm run lint && npm run build`
Expected: all PASS, no lint errors, build succeeds.

- [ ] **Step 4: Visual verification**

Run: `npm run dev`, open the app, and check against the spec: cream background, serif date header with italic clay greeting, hairline sections, terracotta active nav; toggle dark mode (warm near-black, not blue-gray); check Today, Journal, Insights, Reminders, auth screens. Stop the dev server when done.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete journal redesign sweep"
```

---

## Self-Review Notes

- **Spec coverage:** tokens/typography/material (T1), Section + components (T2), shell (T3), Today (T4–5), History→Journal (T6), Charts→Insights (T7), Reminders/Auth (T8), signature italic accent (T3 wordmark, T4 greeting, T6 empty state), dark mode (T1 CSS var flip + T9 check), chart palette (T7), final verification (T9). Meds strikethrough (T5), link underline hover pattern folded into `linkText` hovers and default browser underline on inline links.
- **Type consistency:** `Section` props (`title`, `action?`, `children`, `className?`) used consistently in T4; `CHART_COLORS` keys match T7 usages; `greeting` return type used in T4.
