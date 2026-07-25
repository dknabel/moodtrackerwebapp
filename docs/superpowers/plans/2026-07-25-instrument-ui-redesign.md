# "The Instrument" UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current half-migrated "journal/clay" UI with a dark-first precision-instrument identity (Clash Display + JetBrains Mono, `#0A0B0D`/`#FF9E40`), including a full data-visualization overhaul (mood dial, rhythm chart, calendar heatmap, adherence strips, themed tooltips).

**Architecture:** Single source of truth = Tailwind 4 `@theme` tokens in `src/index.css`; components consume tokens, never raw hex. Charts stay on recharts 3.8 except three new hand-rolled SVG/HTML visualizations backed by pure, unit-tested helpers (`src/lib/dial.ts`, `src/lib/heatmap.ts`, `src/lib/adherence.ts`). `src/lib/chartColors.ts` is rewritten to mirror the same palette (recharts needs real hexes for SVG fills). No route, feature, data, or Supabase changes.

**Tech Stack:** React 19, Vite, Tailwind CSS 4 (CSS-first `@theme`), recharts 3.8, Vitest + RTL, date-fns, Capacitor (UI untouched natively).

**Spec:** `docs/superpowers/specs/2026-07-25-instrument-ui-redesign-design.md` (commit `41410c9`).

## Global Constraints

- Dark mode is the primary face: `bg #0A0B0D`, `surface #121316`, `line #262A31`, `ink #FBFBFB`, `muted #B8BCC4`, `faint #69707A`, `signal #FF9E40`, `pass #5FA8C7`, `warn #D9A24A`, `danger #D85C46`. Light inversion: `bg #F6F6F4`, `surface #FFFFFF`, `line #E3E3DE`, `ink #101012`, `muted #55575C`, `faint #9A9C9F`, `signal #D9730F`, `pass #3E7C99`, `warn #B07E2E`, `danger #B84A36`.
- Fonts: Clash Display Variable (`--font-sans`) + JetBrains Mono Variable (`--font-mono`), self-hosted via fontsource. No serif anywhere; no italics.
- Components consume tokens, never raw hex. Only exception: `GoogleButton.tsx` brand SVG.
- Depth via 1px hairlines + signal glow; no card-in-card, no hover lift-and-shadow. Radii: 4/8/12px (existing pill buttons stay pill).
- Motion CSS-only, all gated by the existing `prefers-reduced-motion` kill-switch in the base layer. Signature easing `cubic-bezier(0.22,1,0.36,1)`.
- Section headers use numbered markers `NN / TITLE` in mono uppercase 11px, `tracking-[0.12em]`, `text-faint`.
- Numbers use the `tnum` utility (tabular-nums).
- iOS safe-area handling, dark-class strategy (`.dark` on `<html>`), iOS anti-zoom input fix, and BottomNav height ↔ AppShell `pb-[calc(5rem+...)]` coupling must be preserved.
- `npm run test`, `npm run lint`, `npm run build` must pass at the end of every task.
- Old token names to eradicate: `clay`, `clay-deep`, `clay-tint`, `paper`, `signal-soft` (old meaning), `font-serif`, `bg-black/50`, `shadow-[0_20px_48px_rgba(27,25,22,0.12)]`.

---

### Task 1: Design tokens + fonts in `index.css`

**Files:**
- Modify: `src/index.css` (full rewrite)
- Modify: `package.json` (font dependency swap)

**Interfaces:**
- Produces: Tailwind color utilities `bg/surface/line/ink/muted/faint/signal/signal-soft/pass/warn/danger`; font utilities `font-sans` (Clash Display), `font-mono` (JetBrains Mono); utilities `tnum`, `meta-label`, `glow-signal`, `animate-breathe`, `animate-dial-pulse`, `animate-reveal`. Every later task consumes these.

- [ ] **Step 1: Verify the font packages exist, then swap dependencies**

```bash
npm view @fontsource-variable/clash-display version
npm view @fontsource-variable/jetbrains-mono version
```

Expected: both print a version (e.g. `5.x.x`). If `@fontsource-variable/jetbrains-mono` is missing, use `@fontsource/jetbrains-mono` with weight imports `400.css`, `500.css`, `700.css` instead and adjust the `@import` lines below.

```bash
npm uninstall @fontsource-variable/archivo @fontsource-variable/fraunces @fontsource-variable/geist @fontsource-variable/geist-mono @fontsource/courier-prime
npm install @fontsource-variable/clash-display @fontsource-variable/jetbrains-mono
```

- [ ] **Step 2: Rewrite `src/index.css` completely**

```css
@import '@fontsource-variable/clash-display';
@import '@fontsource-variable/jetbrains-mono';
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
  --bg: #F6F6F4;
  --surface: #FFFFFF;
  --line: #E3E3DE;
  --ink: #101012;
  --muted: #55575C;
  --faint: #9A9C9F;
  --signal: #D9730F;
  --signal-soft: rgba(217, 115, 15, 0.14);
  --pass: #3E7C99;
  --warn: #B07E2E;
  --danger: #B84A36;
  --ease-reveal: cubic-bezier(0.22, 1, 0.36, 1);
}

.dark {
  color-scheme: dark;
  --bg: #0A0B0D;
  --surface: #121316;
  --line: #262A31;
  --ink: #FBFBFB;
  --muted: #B8BCC4;
  --faint: #69707A;
  --signal: #FF9E40;
  --signal-soft: rgba(255, 158, 64, 0.12);
  --pass: #5FA8C7;
  --warn: #D9A24A;
  --danger: #D85C46;
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-line: var(--line);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-signal: var(--signal);
  --color-signal-soft: var(--signal-soft);
  --color-pass: var(--pass);
  --color-warn: var(--warn);
  --color-danger: var(--danger);
  --font-sans: 'Clash Display Variable', -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, 'SF Mono', monospace;
}

@layer base {
  body {
    background-color: var(--bg);
    color: var(--ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
}

@utility tnum {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

@utility meta-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

@utility glow-signal {
  box-shadow:
    0 0 16px color-mix(in srgb, var(--signal) 18%, transparent),
    0 0 32px color-mix(in srgb, var(--signal) 10%, transparent);
}

@keyframes cta-breathe {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--signal) 18%, transparent); }
}

@utility animate-breathe {
  animation: cta-breathe 3.4s ease-in-out infinite;
}

@keyframes dial-pulse {
  0%, 100% { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--signal) 18%, transparent)); }
  50% { filter: drop-shadow(0 0 20px color-mix(in srgb, var(--signal) 30%, transparent)); }
}

@utility animate-dial-pulse {
  animation: dial-pulse 3s ease-in-out infinite;
}

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@utility animate-reveal {
  animation: reveal-up 0.56s var(--ease-reveal) both;
}
```

- [ ] **Step 3: Verify the build compiles with the new tokens**

Run: `npm run build`
Expected: builds successfully. Component styling will be broken/unfinished (old `clay` classes no longer exist — they silently no-op in Tailwind 4); that is expected and fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/index.css package.json package-lock.json
git commit -m "feat: instrument design tokens and fonts (Clash Display + JetBrains Mono)"
```

---

### Task 2: Rewrite `chartColors.ts` to mirror the instrument palette

**Files:**
- Modify: `src/lib/chartColors.ts` (full rewrite)
- Test: `src/lib/chartColors.test.ts`

**Interfaces:**
- Produces: `CHART_COLORS` with the same key shape as today (`series`, `grid{light,dark}`, `tick{light,dark}`, `barInactive{light,dark}`, `barActive`, `sleepHours`, `sleepQuality`) so existing chart components keep compiling; values now mirror the Task 1 tokens.

- [ ] **Step 1: Update the failing test first**

Replace the body of `src/lib/chartColors.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { CHART_COLORS } from './chartColors'

describe('CHART_COLORS', () => {
  it('uses the instrument palette, never default recharts blues', () => {
    const all = JSON.stringify(CHART_COLORS)
    expect(all).not.toMatch(/#2563eb|#16a34a|#7c3aed|#0891b2|#f59e0b|#E5604A/i)
    expect(CHART_COLORS.series[0]).toBe('#FF9E40')
    expect(CHART_COLORS.series).toEqual(['#FF9E40', '#5FA8C7', '#D9A24A'])
  })

  it('mirrors the dark CSS tokens for grid and ticks', () => {
    expect(CHART_COLORS.grid.dark).toBe('#262A31')
    expect(CHART_COLORS.tick.dark).toBe('#69707A')
    expect(CHART_COLORS.barInactive.dark).toBe('#262A31')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chartColors.test.ts`
Expected: FAIL (`series[0]` is still `#E5604A`)

- [ ] **Step 3: Rewrite `src/lib/chartColors.ts`**

```ts
// Mirrors the @theme tokens in src/index.css. recharts needs real hexes for
// SVG fills, so keep this in lockstep with the CSS (the test pins the values).
export const CHART_COLORS = {
  series: ['#FF9E40', '#5FA8C7', '#D9A24A'] as const,
  grid: { light: '#E3E3DE', dark: '#262A31' },
  tick: { light: '#9A9C9F', dark: '#69707A' },
  barInactive: { light: '#E3E3DE', dark: '#262A31' },
  barActive: '#FF9E40',
  sleepHours: '#5FA8C7',
  sleepQuality: '#FF9E40',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/chartColors.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/chartColors.ts src/lib/chartColors.test.ts
git commit -m "feat: chart colors mirror instrument tokens"
```

---

### Task 3: Style helpers in `styles.ts` (signal focus ring, breathing primary button)

**Files:**
- Modify: `src/lib/styles.ts`
- Test: `src/lib/styles.test.ts`

**Interfaces:**
- Produces: `focusRing`, `btnPrimary`, `btnSecondary`, `linkText`, `eyebrow` (same exported names; consumed by AppShell, BottomNav, modals, auth forms, HistoryPage, StatsSection, CorrelationsSection, RemindersPage).

- [ ] **Step 1: Update the failing test first**

Replace the body of `src/lib/styles.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { focusRing, btnPrimary, btnSecondary, linkText, eyebrow } from './styles'

describe('style helpers', () => {
  it('uses signal tokens, never legacy palette colors', () => {
    // Word boundaries keep 'red' from matching inside words like 'expired'.
    const legacy = /\b(blue|gray|slate|zinc|neutral|sky|stone|red|green|clay|paper)\b/
    for (const cls of [focusRing, btnPrimary, btnSecondary, linkText, eyebrow]) {
      expect(cls).not.toMatch(legacy)
    }
    expect(focusRing).toContain('ring-signal')
    expect(btnPrimary).toContain('bg-signal')
    expect(btnPrimary).toContain('animate-breathe')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/styles.test.ts`
Expected: FAIL (`ring-clay`, `bg-clay` assertions gone, new ones fail)

- [ ] **Step 3: Rewrite `src/lib/styles.ts`**

```ts
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal'

export const btnPrimary =
  'bg-signal text-bg rounded-full px-4 py-2 text-sm font-medium transition-shadow duration-200 animate-breathe hover:glow-signal disabled:opacity-40 disabled:animate-none'

export const btnSecondary =
  'border border-line text-ink rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 hover:border-ink disabled:opacity-40'

export const linkText = 'text-signal font-medium'

export const eyebrow = 'meta-label'
```

Note: `text-bg` is intentional — near-black text on the signal-amber fill.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/styles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/styles.ts src/lib/styles.test.ts
git commit -m "feat: signal-based style helpers with breathing primary button"
```

---

### Task 4: `Section` primitive with numbered markers

**Files:**
- Modify: `src/components/ui/Section.tsx`
- Modify: every `<Section` consumer (find with grep; known: `src/components/charts/SleepChart.tsx`, `src/components/charts/FieldChart.tsx`, `src/components/charts/OverlaySection.tsx`, `src/components/today/TodayPage.tsx` — plus any others grep finds)
- Test: `src/components/ui/Section.test.tsx`

**Interfaces:**
- Produces: `<Section index?: number title: string action?: ReactNode className?: string>` — renders heading text `NN / TITLE` when `index` is given, plain `TITLE` when omitted. Later tasks (ChartsPage numbering, FieldChart `index` prop) rely on this signature.

- [ ] **Step 1: Update the failing test first**

Replace the body of `src/components/ui/Section.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Section } from './Section'

describe('Section', () => {
  it('renders a numbered mono marker and children', () => {
    render(<Section index={1} title="Sleep"><p>content</p></Section>)
    const heading = screen.getByRole('heading', { name: '01 / Sleep' })
    expect(heading.className).toContain('font-mono')
    expect(heading.className).toContain('uppercase')
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders a plain marker when no index is given', () => {
    render(<Section title="Mood"><p>x</p></Section>)
    expect(screen.getByRole('heading', { name: 'Mood' })).toBeInTheDocument()
  })

  it('renders without a card box (no surface background)', () => {
    const { container } = render(<Section title="Mood"><p>x</p></Section>)
    expect(container.firstElementChild!.className).not.toMatch(/bg-surface|rounded-xl|shadow/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/Section.test.tsx`
Expected: FAIL (heading is currently just `Sleep`; also the old test asserted `meta-label` behavior)

- [ ] **Step 3: Rewrite `src/components/ui/Section.tsx`**

```tsx
import type { ReactNode } from 'react'

interface SectionProps {
  /** 1-based position on the page; renders as `NN / TITLE`. */
  index?: number
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Section({ index, title, action, children, className = '' }: SectionProps) {
  const marker = index !== undefined ? `${String(index).padStart(2, '0')} / ${title}` : title
  return (
    <section className={`flex flex-col gap-3 pt-4 border-t border-line ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{marker}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
```

(The old `eyebrow` import is dropped; `eyebrow`/`meta-label` remains for non-Section headings like StatsSection until Task 19.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/Section.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Pass `index` at every `<Section` call site**

Run: `grep -rn "<Section" src/`
For each page, number sections sequentially in render order starting at 1:
- `SleepChart.tsx`: `<Section index={2} title="Sleep">` (Task 18 makes Mood = 01 on the Insights page; until then the number is harmless).
- `FieldChart.tsx`: add `index?: number` to `FieldChartProps` and forward it: `function ChartCard({ index, title, right, children })` → `<Section index={index} title={title} action={right}>`, and `<ChartCard index={index} ...>` at all three render branches. ChartsPage passes `index={i + 3}` inside the `.map` — do that wiring in this step too (`src/components/charts/ChartsPage.tsx` line ~100: `.map((f, i) => (<FieldChart key={f.id} index={i + 3} ...`).
- `OverlaySection.tsx`: `<Section index={overlayIndex} title="Compare">` — add `index?: number` to its `Props` and pass from ChartsPage as `3 + fieldChartCount`. Compute `const fieldChartCount = activeFields.filter(f => f.show_in_charts).length` in ChartsPage.
- `TodayPage.tsx`: number its sections in render order (`01`, `02`, `03`…).

- [ ] **Step 6: Run the full suite + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: numbered section markers across pages"
```

---

### Task 5: Shared themed `ChartTooltip` component

**Files:**
- Create: `src/components/charts/ChartTooltip.tsx`
- Test: `src/components/charts/ChartTooltip.test.tsx`

**Interfaces:**
- Produces: `<ChartTooltip active? payload? label? unit?>` matching the recharts custom-tooltip content signature (`content={<ChartTooltip />}`). Consumed by SleepChart (Task 13), FieldChart (Task 14), RhythmChart (Task 16), OverlaySection + CorrelationsSection (Task 19).

- [ ] **Step 1: Write the failing test**

Create `src/components/charts/ChartTooltip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChartTooltip } from './ChartTooltip'

describe('ChartTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<ChartTooltip active={false} payload={[{ name: 'Mood', value: 7 }]} label="07-20" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders label and mono values when active', () => {
    render(<ChartTooltip active payload={[{ name: 'Mood', value: 7, color: '#FF9E40' }]} label="07-20" />)
    expect(screen.getByText('07-20')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Mood')).toBeInTheDocument()
  })

  it('appends the unit when given', () => {
    render(<ChartTooltip active unit="h" payload={[{ name: 'Hours', value: 7.5 }]} />)
    expect(screen.getByText('7.5h')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/charts/ChartTooltip.test.tsx`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Create `src/components/charts/ChartTooltip.tsx`**

```tsx
interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  unit?: string
}

export function ChartTooltip({ active, payload, label, unit = '' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-surface border border-line rounded-lg px-3 py-2 flex flex-col gap-1">
      {label !== undefined && (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs tnum text-ink flex items-center gap-2">
          {p.color && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          )}
          <span className="text-muted">{p.name}</span>
          <span>{p.value}{unit}</span>
        </p>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/charts/ChartTooltip.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/ChartTooltip.tsx src/components/charts/ChartTooltip.test.tsx
git commit -m "feat: shared themed chart tooltip"
```

---

### Task 6: Dial math helper `src/lib/dial.ts`

**Files:**
- Create: `src/lib/dial.ts`
- Test: `src/lib/dial.test.ts`

**Interfaces:**
- Produces:
  - `valueFraction(value: number, min: number, max: number): number` — clamped 0–1; returns 0 when `max <= min`.
  - `polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number }` — 0° = 12 o'clock, positive clockwise.
  - `arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string` — SVG arc path (`M … A …`).
  - `gaugeArc(value: number, min: number, max: number, cx: number, cy: number, r: number): string` — arc from −135° sweeping up to 270° total based on `valueFraction`.
  - `deltaVsAverage(latest: number, recent: number[]): number | null` — `latest − mean(recent)`; null when `recent` is empty.
- Consumed by: MoodDial (Task 15).

- [ ] **Step 1: Write the failing test**

Create `src/lib/dial.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { valueFraction, polarToCartesian, arcPath, gaugeArc, deltaVsAverage } from './dial'

describe('valueFraction', () => {
  it('maps value into a clamped 0-1 fraction', () => {
    expect(valueFraction(5, 1, 10)).toBeCloseTo(4 / 9)
    expect(valueFraction(0, 1, 10)).toBe(0)
    expect(valueFraction(99, 1, 10)).toBe(1)
  })
  it('returns 0 for a degenerate range', () => {
    expect(valueFraction(5, 10, 10)).toBe(0)
  })
})

describe('polarToCartesian', () => {
  it('puts 0 degrees at 12 o-clock and 90 degrees at 3 o-clock', () => {
    const top = polarToCartesian(0, 0, 10, 0)
    expect(top.x).toBeCloseTo(0)
    expect(top.y).toBeCloseTo(-10)
    const right = polarToCartesian(0, 0, 10, 90)
    expect(right.x).toBeCloseTo(10)
    expect(right.y).toBeCloseTo(0)
  })
})

describe('arcPath / gaugeArc', () => {
  it('produces an SVG arc', () => {
    expect(arcPath(80, 80, 64, -135, 135)).toMatch(/^M .+ A 64 64 0 1 1 .+$/)
  })
  it('gaugeArc spans the full 270 degrees at max and stays at start at min', () => {
    const full = gaugeArc(10, 1, 10, 80, 80, 64)
    const empty = gaugeArc(1, 1, 10, 80, 80, 64)
    const endOf = (d: string) => d.trim().split(' ').slice(-2).map(Number)
    const fullEnd = endOf(full)
    const expected = polarToCartesian(80, 80, 64, 135)
    expect(fullEnd[0]).toBeCloseTo(expected.x)
    expect(fullEnd[1]).toBeCloseTo(expected.y)
    const emptyEnd = endOf(empty)
    const start = polarToCartesian(80, 80, 64, -135)
    expect(emptyEnd[0]).toBeCloseTo(start.x)
    expect(emptyEnd[1]).toBeCloseTo(start.y)
  })
})

describe('deltaVsAverage', () => {
  it('returns latest minus mean of recent', () => {
    expect(deltaVsAverage(8, [6, 7])).toBeCloseTo(1.5)
  })
  it('returns null with no recent values', () => {
    expect(deltaVsAverage(8, [])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dial.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Create `src/lib/dial.ts`**

```ts
export function valueFraction(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg)
  const end = polarToCartesian(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/** 270° gauge starting at −135° (7:30 position) sweeping clockwise. */
export function gaugeArc(value: number, min: number, max: number, cx: number, cy: number, r: number): string {
  return arcPath(cx, cy, r, -135, -135 + 270 * valueFraction(value, min, max))
}

export function deltaVsAverage(latest: number, recent: number[]): number | null {
  if (recent.length === 0) return null
  return latest - recent.reduce((a, b) => a + b, 0) / recent.length
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dial.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/dial.ts src/lib/dial.test.ts
git commit -m "feat: dial gauge math helpers"
```

---

### Task 7: Calendar heatmap helper `src/lib/heatmap.ts`

**Files:**
- Create: `src/lib/heatmap.ts`
- Test: `src/lib/heatmap.test.ts`

**Interfaces:**
- Produces:
  - `interface HeatmapCell { date: string; value: number | null; opacity: number }` — `date` is `yyyy-MM-dd`; `opacity` 0 for empty/future days, else 0.15–1.
  - `valueToOpacity(value: number, min: number, max: number): number` — maps into `[0.15, 1]`; returns 1 for degenerate ranges.
  - `buildMonthCells(month: Date, valuesByDate: Map<string, number>, today?: Date): Array<Array<HeatmapCell | null>>` — array of weeks; each week is 7 slots (Sunday-first); `null` = outside the month.
- Consumed by: CalendarHeatmap (Task 17).

- [ ] **Step 1: Write the failing test**

Create `src/lib/heatmap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildMonthCells, valueToOpacity } from './heatmap'

const JULY_2026 = new Date(2026, 6, 15) // any day in July 2026

describe('valueToOpacity', () => {
  it('maps the range into 0.15-1', () => {
    expect(valueToOpacity(1, 1, 10)).toBeCloseTo(0.15)
    expect(valueToOpacity(10, 1, 10)).toBeCloseTo(1)
    expect(valueToOpacity(0, 1, 10)).toBeCloseTo(0.15) // clamped below
  })
  it('returns 1 for a degenerate range', () => {
    expect(valueToOpacity(5, 5, 5)).toBe(1)
  })
})

describe('buildMonthCells', () => {
  const today = new Date(2026, 6, 25)
  const values = new Map([['2026-07-03', 8]])

  it('covers the whole month in 7-slot weeks starting Sunday', () => {
    const weeks = buildMonthCells(JULY_2026, values, today)
    for (const week of weeks) expect(week).toHaveLength(7)
    const dates = weeks.flat().filter(c => c !== null).map(c => c!.date)
    expect(dates[0]).toBe('2026-07-01')
    expect(dates[dates.length - 1]).toBe('2026-07-31')
    // 2026-07-01 is a Wednesday → 3 leading nulls in week 1
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null])
    expect(weeks[0][3]!.date).toBe('2026-07-01')
  })

  it('maps values to opacity and zeroes days without data', () => {
    const weeks = buildMonthCells(JULY_2026, values, today)
    const cells = weeks.flat().filter(c => c !== null)
    const withValue = cells.find(c => c!.date === '2026-07-03')!
    expect(withValue.value).toBe(8)
    expect(withValue.opacity).toBeGreaterThan(0)
    const withoutValue = cells.find(c => c!.date === '2026-07-04')!
    expect(withoutValue.value).toBeNull()
    expect(withoutValue.opacity).toBe(0)
  })

  it('zeroes future days', () => {
    const weeks = buildMonthCells(JULY_2026, values, today)
    const cells = weeks.flat().filter(c => c !== null)
    const future = cells.find(c => c!.date === '2026-07-31')!
    expect(future.value).toBeNull()
    expect(future.opacity).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/heatmap.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Create `src/lib/heatmap.ts`**

```ts
import { startOfMonth, endOfMonth, addDays, format, isAfter } from 'date-fns'

export interface HeatmapCell {
  date: string
  value: number | null
  opacity: number
}

export function valueToOpacity(value: number, min: number, max: number): number {
  if (max <= min) return 1
  const f = Math.min(1, Math.max(0, (value - min) / (max - min)))
  return 0.15 + 0.85 * f
}

export function buildMonthCells(
  month: Date,
  valuesByDate: Map<string, number>,
  today: Date = new Date(),
  min = 1,
  max = 10,
): Array<Array<HeatmapCell | null>> {
  const first = startOfMonth(month)
  const last = endOfMonth(month)
  const weeks: Array<Array<HeatmapCell | null>> = []
  let week: Array<HeatmapCell | null> = Array(first.getDay()).fill(null)
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const date = format(d, 'yyyy-MM-dd')
    const raw = valuesByDate.get(date)
    const value = raw !== undefined && !isAfter(d, today) ? raw : null
    week.push({ date, value, opacity: value === null ? 0 : valueToOpacity(value, min, max) })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/heatmap.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/heatmap.ts src/lib/heatmap.test.ts
git commit -m "feat: calendar heatmap bucketing helpers"
```

---

### Task 8: Medication adherence helper `src/lib/adherence.ts`

**Files:**
- Create: `src/lib/adherence.ts`
- Test: `src/lib/adherence.test.ts`

**Interfaces:**
- Produces:
  - `interface AdherenceDay { date: string; taken: boolean | null }` — `null` = no record that day.
  - `buildAdherenceDays(logs: Array<{ date: string; medication_id: string; taken: boolean }>, medicationId: string, days: number, today?: Date): AdherenceDay[]` — trailing `days` days ending at `today`, ascending by date.
- Consumed by: MedAdherenceSection (Task 18).

- [ ] **Step 1: Write the failing test**

Create `src/lib/adherence.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildAdherenceDays } from './adherence'

const today = new Date(2026, 6, 25) // 2026-07-25
const logs = [
  { date: '2026-07-25', medication_id: 'm1', taken: true },
  { date: '2026-07-23', medication_id: 'm1', taken: false },
  { date: '2026-07-24', medication_id: 'm2', taken: true },
]

describe('buildAdherenceDays', () => {
  it('returns trailing days ascending, filtered to the medication', () => {
    const days = buildAdherenceDays(logs, 'm1', 3, today)
    expect(days.map(d => d.date)).toEqual(['2026-07-23', '2026-07-24', '2026-07-25'])
    expect(days.map(d => d.taken)).toEqual([false, null, true])
  })
  it('returns all nulls when the medication has no logs', () => {
    const days = buildAdherenceDays(logs, 'm3', 2, today)
    expect(days.map(d => d.taken)).toEqual([null, null])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/adherence.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Create `src/lib/adherence.ts`**

```ts
import { format, subDays } from 'date-fns'

export interface AdherenceDay {
  date: string
  taken: boolean | null
}

interface MedLogLike {
  date: string
  medication_id: string
  taken: boolean
}

export function buildAdherenceDays(
  logs: MedLogLike[],
  medicationId: string,
  days: number,
  today: Date = new Date(),
): AdherenceDay[] {
  const byDate = new Map<string, boolean>()
  for (const l of logs) {
    if (l.medication_id === medicationId) byDate.set(l.date, l.taken)
  }
  const result: AdherenceDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd')
    result.push({ date, taken: byDate.get(date) ?? null })
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/adherence.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/adherence.ts src/lib/adherence.test.ts
git commit -m "feat: medication adherence segment helper"
```

---

### Task 9: Restyle shared primitives (Slider, Stepper, Skeleton, ConfirmDialog)

**Files:**
- Modify: `src/components/ui/Slider.tsx`
- Modify: `src/components/ui/Stepper.tsx`
- Modify: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: tokens + utilities from Task 1. Produces: unchanged component props — pure visual restyle, no interface changes.

- [ ] **Step 1: Restyle `Slider.tsx`**

Two changes: the value readout becomes mono tabular signal, and the range input uses the signal accent.

- Line 18: `<span className="font-serif text-lg text-clay">{value}</span>` → `<span className="font-mono text-lg tnum text-signal">{value}</span>`
- Line 35: `className="w-full accent-clay h-2 cursor-pointer"` → `className="w-full accent-signal h-2 cursor-pointer"`

- [ ] **Step 2: Restyle `Stepper.tsx`**

- Line 15 (decrease button): remove `hover:-translate-y-0.5`, change `transition-all` → `transition-colors`, add `hover:border-ink`. Final: `className="w-9 h-9 rounded-full border border-line text-lg font-medium text-ink transition-colors duration-150 hover:border-ink disabled:opacity-40"`
- Line 20 (value): `<span className="font-serif text-xl w-6 text-center text-ink">{value}</span>` → `<span className="font-mono text-xl tnum w-8 text-center text-ink">{value}</span>`
- Line 25 (increase button): same treatment as the decrease button.

- [ ] **Step 3: Restyle `Skeleton.tsx`**

`animate-pulse rounded-xl bg-clay-tint` → `animate-pulse rounded-xl bg-surface`

- [ ] **Step 4: Restyle `ConfirmDialog.tsx`**

- Line 16 scrim: `bg-black/50` → `bg-black/60 backdrop-blur-sm`
- Line 24 panel: `bg-surface rounded-2xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-[0_20px_48px_rgba(27,25,22,0.12)]` → `bg-surface border border-line rounded-xl p-5 w-full max-w-sm flex flex-col gap-3 shadow-lg`
- Line 27 title: `font-serif text-lg text-ink` → `font-sans font-medium text-lg text-ink tracking-[-0.01em]`
- Line 42 confirm button: keep `bg-danger text-white` (danger works in both themes; `text-white` is acceptable on `#D85C46`/`#B84A36`), add the shared focus ring: import `focusRing` from `../../lib/styles` and append `${focusRing}` to both buttons' class strings.

- [ ] **Step 5: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass (behavioral tests query by role/label, so they survive)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: restyle shared primitives to instrument tokens"
```

---

### Task 10: App shell — wordmark, BottomNav, dark-first default theme

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/BottomNav.tsx`
- Modify: `src/components/ThemeProvider.tsx` (dark-first default)
- Modify: `src/hooks/useTheme.test.ts` and/or `src/components/layout/AppShell` tests if they pin the old fallback
- Test: `src/components/layout/BottomNav.test.tsx`

**Interfaces:**
- Consumes: tokens/utilities from Task 1, `focusRing` from Task 3. Produces: unchanged component APIs.

- [ ] **Step 1: Update the failing test first**

In `src/components/layout/BottomNav.test.tsx`, replace the second test:

```tsx
  it('marks the active tab with signal, not clay or blue', () => {
    render(<MemoryRouter initialEntries={['/']}><BottomNav /></MemoryRouter>)
    const today = screen.getByRole('link', { name: 'Today' })
    expect(today.className).toContain('text-signal')
    expect(today.className).not.toMatch(/clay|blue/)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/BottomNav.test.tsx`
Expected: FAIL (`text-clay` still rendered)

- [ ] **Step 3: Rewrite `BottomNav.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardList, LineChart, Bell } from 'lucide-react'
import { focusRing } from '../../lib/styles'

const tabs = [
  { to: '/', label: 'Today', Icon: CalendarDays },
  { to: '/history', label: 'History', Icon: ClipboardList },
  { to: '/charts', label: 'Charts', Icon: LineChart },
  { to: '/reminders', label: 'Reminders', Icon: Bell },
]

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line flex pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-1 font-mono text-[10px] uppercase tracking-[0.08em] ${focusRing} ${
              isActive ? 'text-signal' : 'text-faint'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              {label}
              <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-signal glow-signal' : 'bg-transparent'}`} />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Restyle the `AppShell.tsx` wordmark**

Line 18–20:

```tsx
        <span className="font-sans font-medium text-xl text-ink tracking-[-0.02em]">
          Mood Tracker<span className="text-signal">.</span>
        </span>
```

(No `font-serif`, no `<em>` italic. Everything else in AppShell stays — `bg-bg`, safe-area padding, focusRing buttons.)

- [ ] **Step 5: Make dark the default theme**

Read `src/components/ThemeProvider.tsx` and `src/hooks/useTheme.ts` first. Change the initial-theme resolution so that when `localStorage['theme']` is unset the theme is `dark` (instead of following `prefers-color-scheme`). A stored `'light'` choice still wins. Then run `npx vitest run src/hooks` and update any test that pinned the old `prefers-color-scheme` fallback to expect `dark`.

- [ ] **Step 6: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: instrument shell — wordmark, signal nav, dark-first default"
```

---

### Task 11: Today page sweep

**Files:**
- Modify: `src/components/today/TodayPage.tsx`
- Modify: `src/components/today/SleepSection.tsx`
- Modify: `src/components/today/FieldSection.tsx`
- Modify: `src/components/today/MedsSection.tsx`
- Modify: `src/components/today/ManageFieldsModal.tsx`
- Modify: `src/components/today/ManageMedsModal.tsx`

**Interfaces:**
- Consumes: tokens/utilities from Task 1, helpers from Task 3, numbered `Section` from Task 4. Produces: unchanged component APIs.

- [ ] **Step 1: Apply the global token mapping**

Apply these replacements across all six files (verify each with grep after):

| Find | Replace with |
|---|---|
| `font-serif` | `font-sans font-medium` (on headings/values; large date H1 keeps `text-3xl tracking-[-0.025em]`) |
| `text-clay` | `text-signal` |
| `text-clay-deep` | `text-signal` |
| `bg-clay-deep` | `bg-signal` |
| `text-white` (only where paired with `bg-clay-deep`/`bg-signal`) | `text-bg` |
| `bg-clay-tint` | `bg-signal-soft` |
| `accent-clay` | `accent-signal` |
| `ring-clay` / `focus:ring-clay` | `ring-signal` / `focus:ring-signal` |
| `bg-black/50` | `bg-black/60 backdrop-blur-sm` |
| `shadow-[0_20px_48px_rgba(27,25,22,0.12)]` | `shadow-lg border border-line` |
| `<em className="italic text-signal">…</em>` (greeting accent, after the above) | `<span className="text-signal">…</span>` — drop the italic |

- [ ] **Step 2: Specific upgrades beyond the mapping**

- `TodayPage.tsx`: the date `<h1>` (currently `font-serif text-3xl tracking-[-0.025em]`) becomes `font-sans font-medium text-3xl tracking-[-0.025em] text-ink`; the save-status text and date-nav chevrons keep behavior, colors become `text-faint`/`text-muted` as they already are.
- `FieldSection.tsx` tag chips: selected state `bg-signal text-bg border-signal`; unselected `border-line text-ink` with `hover:border-ink`.
- `ManageFieldsModal.tsx` / `ManageMedsModal.tsx`: bottom-sheet surface `bg-surface border-t border-x border-line rounded-t-2xl`; titles `font-sans font-medium`.

- [ ] **Step 3: Verify no legacy classes remain in today/**

Run: `grep -rn "clay\|font-serif\|bg-black/50\|rgba(27,25,22" src/components/today/`
Expected: no matches

- [ ] **Step 4: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 5: Visual check in browser**

Run `npm run dev`, open the Today page in dark and light mode: date in Clash Display, mono section markers, signal accents, no broken (unstyled) elements. Stop the dev server after checking.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: restyle Today page to instrument theme"
```

---

### Task 12: History page sweep

**Files:**
- Modify: `src/components/history/HistoryPage.tsx`
- Modify: `src/components/history/HistoryEntry.tsx`

**Interfaces:**
- Consumes: Task 1 tokens, Task 3 helpers. Produces: unchanged APIs.

- [ ] **Step 1: Apply the Task 11 mapping table** to both files (same find/replace pairs, including the italic `<em>` → `<span>` change for the wordmark accent at `HistoryPage.tsx` ~line 157).

- [ ] **Step 2: Specific upgrades**

- Entry dates: `font-serif` → `font-sans font-medium` (dates keep their size; add `tnum`).
- Journal quotes: currently italic serif — becomes `font-sans text-muted` with a `border-l-2 border-line pl-3` left rule instead of italics.
- Export panel card `bg-surface border-line rounded-xl` → keep `border border-line rounded-xl` but drop `bg-surface` (flat on the page canvas); range/format pills: selected `bg-signal text-bg`, unselected `text-faint`.

- [ ] **Step 3: Verify no legacy classes remain**

Run: `grep -rn "clay\|font-serif\|italic" src/components/history/`
Expected: no matches

- [ ] **Step 4: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: restyle History as instrument log"
```

---

### Task 13: Rebuild `SleepChart` — bars + line, themed tooltip

**Files:**
- Modify: `src/components/charts/SleepChart.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Section` (Task 4, `index={2}`), `ChartTooltip` (Task 5), `CHART_COLORS` (Task 2). Produces: unchanged props `{ logs: DailyLog[]; isDark?: boolean }`.

- [ ] **Step 1: Rewrite `SleepChart.tsx`**

```tsx
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'
import { CHART_COLORS } from '../../lib/chartColors'
import { Section } from '../ui/Section'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

interface SleepChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function SleepChart({ logs, isDark }: SleepChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Hours: l.sleep_hours,
    Quality: l.sleep_quality,
  }))

  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const tick = { fontSize: 11, fontFamily: MONO, fill: tickColor } as const

  return (
    <Section index={2} title="Sleep">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={tick} tickLine={false} axisLine={false} width={28} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={tick} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
          <Bar yAxisId="hours" dataKey="Hours" fill={CHART_COLORS.sleepHours} barSize={6} radius={[2, 2, 0, 0]} />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke={CHART_COLORS.sleepQuality} strokeWidth={2}
            dot={{ r: 2, fill: CHART_COLORS.sleepQuality, strokeWidth: 0 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: CHART_COLORS.sleepHours }} /> Hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.sleepQuality }} /> Quality
        </span>
      </p>
    </Section>
  )
}
```

(Built-in `Legend` is replaced by the mono swatch row — same info, on-theme.)

- [ ] **Step 2: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: sleep chart as bars + signal line with themed tooltip"
```

---

### Task 14: `FieldChart` — dotted lines, toggle adherence strip, mono tags

**Files:**
- Modify: `src/components/charts/FieldChart.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Section` (Task 4), `ChartTooltip` (Task 5), `CHART_COLORS` (Task 2). Produces: props become `{ field: CustomField; values: FieldValue[]; index?: number; isDark?: boolean }` (index wired from ChartsPage in Task 4 Step 5).

- [ ] **Step 1: Rewrite `FieldChart.tsx`**

```tsx
import type { ReactNode } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { CustomField, FieldValue } from '../../lib/database.types'
import { CHART_COLORS } from '../../lib/chartColors'
import { numericValue } from '../../lib/fields'
import { Section } from '../ui/Section'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

interface FieldChartProps {
  field: CustomField
  values: FieldValue[]
  index?: number
  isDark?: boolean
}

function ChartCard({ index, title, right, children }: {
  index?: number
  title: string
  right?: ReactNode
  children: ReactNode
}) {
  return <Section index={index} title={title} action={right}>{children}</Section>
}

export function FieldChart({ field, values, index, isDark }: FieldChartProps) {
  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const tick = { fontSize: 11, fontFamily: MONO, fill: tickColor } as const

  if (field.type === 'text' || values.length === 0) return null

  if (field.type === 'tags') {
    const counts = new Map<string, number>()
    for (const v of values) {
      if (!Array.isArray(v.value)) continue
      for (const tag of v.value) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    const max = sorted[0][1]
    return (
      <ChartCard index={index} title={field.name}>
        <div className="flex flex-col gap-2">
          {sorted.map(([tag, count]) => (
            <div key={tag} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate text-ink">{tag}</span>
              <div className="flex-1 bg-line rounded-[2px] h-3">
                <div
                  className="h-3 rounded-[2px]"
                  style={{ width: `${(count / max) * 100}%`, backgroundColor: CHART_COLORS.barActive }}
                />
              </div>
              <span className="w-6 text-right font-mono text-xs tnum text-faint">{count}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    )
  }

  const data = values.map(v => ({
    date: v.date.slice(5),
    value: numericValue(field, v.value),
  }))

  if (field.type === 'toggle') {
    const yesDays = data.filter(d => d.value === 1).length
    return (
      <ChartCard
        index={index}
        title={field.name}
        right={<span className="font-mono text-xs tnum text-faint">{yesDays}/{data.length} days</span>}
      >
        <div
          role="img"
          aria-label={`${field.name}: yes on ${yesDays} of ${data.length} days`}
          className="flex gap-[3px]"
        >
          {data.map(d => (
            <div
              key={d.date}
              title={`${d.date}: ${d.value === 1 ? 'Yes' : 'No'}`}
              className={`h-6 flex-1 rounded-[2px] ${d.value === 1 ? 'bg-signal' : 'border border-line'}`}
            />
          ))}
        </div>
      </ChartCard>
    )
  }

  // slider / number → line chart
  const domain: [number | string, number | string] =
    field.type === 'slider'
      ? [field.config.min ?? 1, field.config.max ?? 10]
      : [0, 'auto']

  return (
    <ChartCard index={index} title={field.name}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis domain={domain} tick={tick} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
          <Line type="monotone" dataKey="value" name={field.name} stroke={CHART_COLORS.series[0]} strokeWidth={2}
            dot={{ r: 2, fill: CHART_COLORS.series[0], strokeWidth: 0 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
```

- [ ] **Step 2: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: field charts — dotted signal lines, toggle adherence strips, mono tags"
```

---

### Task 15: `MoodDial` component — the instrument hero

**Files:**
- Create: `src/components/charts/MoodDial.tsx`
- Test: `src/components/charts/MoodDial.test.tsx`

**Interfaces:**
- Consumes: `gaugeArc`, `arcPath`, `deltaVsAverage` from `src/lib/dial.ts` (Task 6); CSS vars `--line`, `--signal` via Tailwind classes and `stroke="currentColor"` tricks below.
- Produces: `<MoodDial value: number | null min: number max: number recent: number[] />` — `recent` = trailing values (excluding the latest) used for the 7-day delta readout. Consumed by ChartsPage (Task 18).

- [ ] **Step 1: Write the failing test**

Create `src/components/charts/MoodDial.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MoodDial } from './MoodDial'

describe('MoodDial', () => {
  it('shows the current value and delta vs recent average', () => {
    render(<MoodDial value={8} min={1} max={10} recent={[6, 7]} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText(/\+1\.5/)).toBeInTheDocument()
  })

  it('shows a placeholder when there is no value', () => {
    render(<MoodDial value={null} min={1} max={10} recent={[]} />)
    expect(screen.getByText('–')).toBeInTheDocument()
  })

  it('labels itself for screen readers', () => {
    render(<MoodDial value={8} min={1} max={10} recent={[6, 7]} />)
    expect(screen.getByRole('img', { name: /mood 8 of 10/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/charts/MoodDial.test.tsx`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Create `src/components/charts/MoodDial.tsx`**

```tsx
import { gaugeArc, arcPath, deltaVsAverage } from '../../lib/dial'

interface MoodDialProps {
  value: number | null
  min: number
  max: number
  /** Trailing values (most recent first or any order) used for the vs-average delta. */
  recent: number[]
}

const CX = 80
const CY = 80
const R = 64

export function MoodDial({ value, min, max, recent }: MoodDialProps) {
  const delta = value !== null ? deltaVsAverage(value, recent) : null
  return (
    <div
      role="img"
      aria-label={value !== null ? `Mood ${value} of ${max}` : 'Mood: no data'}
      className="relative w-40 h-40 animate-dial-pulse"
    >
      <svg viewBox="0 0 160 160" className="w-full h-full">
        <path
          d={arcPath(CX, CY, R, -135, 135)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {value !== null && (
          <path
            d={gaugeArc(value, min, max, CX, CY, R)}
            fill="none"
            stroke="var(--signal)"
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="font-sans font-semibold text-4xl tnum text-ink leading-none">
          {value !== null ? value : '–'}
        </span>
        {delta !== null && (
          <span className="font-mono text-[11px] tnum text-faint">
            {delta >= 0 ? '▲ +' : '▼ −'}{Math.abs(delta).toFixed(1)} vs 7d
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/charts/MoodDial.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/MoodDial.tsx src/components/charts/MoodDial.test.tsx
git commit -m "feat: mood dial gauge component"
```

---

### Task 16: `RhythmChart` — mood area chart with gradient glow

**Files:**
- Create: `src/components/charts/RhythmChart.tsx`

**Interfaces:**
- Consumes: `ChartTooltip` (Task 5), `CHART_COLORS` (Task 2). Produces: `<RhythmChart data: Array<{ date: string; value: number | null }> domain: [number, number] isDark?: boolean />`. Consumed by ChartsPage (Task 18).

- [ ] **Step 1: Create `src/components/charts/RhythmChart.tsx`**

```tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '../../lib/chartColors'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

interface RhythmChartProps {
  data: Array<{ date: string; value: number | null }>
  domain: [number, number]
  isDark?: boolean
}

export function RhythmChart({ data, domain, isDark }: RhythmChartProps) {
  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const tick = { fontSize: 11, fontFamily: MONO, fill: tickColor } as const
  const signal = CHART_COLORS.series[0]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="moodGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={signal} stopOpacity={0.35} />
            <stop offset="100%" stopColor={signal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={{ stroke: gridColor }} />
        <YAxis domain={domain} tick={tick} tickLine={false} axisLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
        <Area type="monotone" dataKey="value" stroke={signal} strokeWidth={2}
          fill="url(#moodGlow)" dot={{ r: 2, fill: signal, strokeWidth: 0 }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Verify build (presentational component; integration coverage comes in Task 18)**

Run: `npm run lint && npm run build`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/RhythmChart.tsx
git commit -m "feat: mood rhythm area chart"
```

---

### Task 17: `CalendarHeatmap` component

**Files:**
- Create: `src/components/charts/CalendarHeatmap.tsx`
- Test: `src/components/charts/CalendarHeatmap.test.tsx`

**Interfaces:**
- Consumes: `buildMonthCells` from `src/lib/heatmap.ts` (Task 7). Produces: `<CalendarHeatmap month: Date valuesByDate: Map<string, number> min: number max: number />`. Consumed by ChartsPage (Task 18).

- [ ] **Step 1: Write the failing test**

Create `src/components/charts/CalendarHeatmap.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CalendarHeatmap } from './CalendarHeatmap'

describe('CalendarHeatmap', () => {
  it('renders one cell per day of the month with data labels', () => {
    const values = new Map([['2026-07-03', 8]])
    render(<CalendarHeatmap month={new Date(2026, 6, 15)} valuesByDate={values} min={1} max={10} />)
    expect(screen.getByRole('img', { name: /july 2026/i })).toBeInTheDocument()
    expect(screen.getByTitle('2026-07-03: 8')).toBeInTheDocument()
    expect(screen.getByTitle('2026-07-04: no data')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/charts/CalendarHeatmap.test.tsx`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Create `src/components/charts/CalendarHeatmap.tsx`**

```tsx
import { format } from 'date-fns'
import { buildMonthCells } from '../../lib/heatmap'

interface CalendarHeatmapProps {
  month: Date
  valuesByDate: Map<string, number>
  min: number
  max: number
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarHeatmap({ month, valuesByDate, min, max }: CalendarHeatmapProps) {
  const weeks = buildMonthCells(month, valuesByDate, new Date(), min, max)
  return (
    <div role="img" aria-label={`${format(month, 'MMMM yyyy')} mood calendar`} className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="font-mono text-[10px] text-faint text-center">{d}</span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell, di) =>
            cell === null ? (
              <span key={di} className="aspect-square" />
            ) : (
              <span
                key={di}
                title={`${cell.date}: ${cell.value ?? 'no data'}`}
                className={`aspect-square rounded-[2px] ${cell.opacity === 0 ? 'border border-line' : ''}`}
                style={cell.opacity > 0 ? { backgroundColor: 'var(--signal)', opacity: cell.opacity } : undefined}
              />
            ),
          )}
        </div>
      ))}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        <span className="font-mono text-[10px] text-faint">Low</span>
        {[0.15, 0.4, 0.65, 1].map(o => (
          <span key={o} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--signal)', opacity: o }} />
        ))}
        <span className="font-mono text-[10px] text-faint">High</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/charts/CalendarHeatmap.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/CalendarHeatmap.tsx src/components/charts/CalendarHeatmap.test.tsx
git commit -m "feat: calendar heatmap component"
```

---

### Task 18: Insights page assembly — mood section, med adherence, numbering

**Files:**
- Create: `src/components/charts/MedAdherenceSection.tsx`
- Modify: `src/components/charts/ChartsPage.tsx`

**Interfaces:**
- Consumes: `MoodDial` (Task 15), `RhythmChart` (Task 16), `CalendarHeatmap` (Task 17), `buildAdherenceDays` (Task 8), `Section` (Task 4), all existing hooks already imported in ChartsPage (`useMedications`, `useMedicationLogsBulk` are already fetched there).
- Produces: `<MedAdherenceSection index: number medications: Medication[] logs: MedicationLog[] days?: number />`. ChartsPage render order after this task: 01 Mood (dial + rhythm + heatmap) → 02 Sleep → 03… other field charts → Compare → Medications → Streaks → Comparisons.

- [ ] **Step 1: Create `src/components/charts/MedAdherenceSection.tsx`**

```tsx
import type { Medication, MedicationLog } from '../../lib/database.types'
import { buildAdherenceDays } from '../../lib/adherence'
import { Section } from '../ui/Section'

interface MedAdherenceSectionProps {
  index: number
  medications: Medication[]
  logs: MedicationLog[]
  days?: number
}

export function MedAdherenceSection({ index, medications, logs, days = 14 }: MedAdherenceSectionProps) {
  const active = medications.filter(m => m.active)
  if (active.length === 0) return null
  return (
    <Section index={index} title="Medications">
      <div className="flex flex-col gap-3">
        {active.map(med => {
          const segments = buildAdherenceDays(logs, med.id, days)
          const taken = segments.filter(s => s.taken === true).length
          return (
            <div key={med.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-ink">{med.name}</span>
                <span className="font-mono text-xs tnum text-faint">{taken}/{days}</span>
              </div>
              <div
                role="img"
                aria-label={`${med.name}: taken ${taken} of ${days} days`}
                className="flex gap-[3px]"
              >
                {segments.map(s => (
                  <div
                    key={s.date}
                    title={`${s.date}: ${s.taken === null ? 'no record' : s.taken ? 'taken' : 'missed'}`}
                    className={`h-4 flex-1 rounded-[2px] ${
                      s.taken === null ? 'border border-line' : s.taken ? 'bg-signal' : 'bg-danger'
                    }`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
```

(Check `src/lib/database.types.ts` for the exact `Medication` shape — it has `id`, `name`, and an `active` flag as used by `useStreaks.ts`. If the flag is named differently, match the type.)

- [ ] **Step 2: Rewrite the render section of `ChartsPage.tsx`**

Add imports:

```tsx
import { MoodDial } from './MoodDial'
import { RhythmChart } from './RhythmChart'
import { CalendarHeatmap } from './CalendarHeatmap'
import { MedAdherenceSection } from './MedAdherenceSection'
import { numericValue } from '../../lib/fields'
```

After the existing `valuesByField` memo, add mood-field resolution and numbering:

```tsx
  const moodField = useMemo(
    () =>
      activeFields.find(f => f.type === 'slider' && f.name.toLowerCase() === 'mood') ??
      activeFields.find(f => f.type === 'slider') ??
      null,
    [activeFields],
  )
  const moodValues = useMemo(
    () => (moodField ? valuesByField.get(moodField.id) ?? [] : []),
    [moodField, valuesByField],
  )
  const moodSeries = useMemo(
    () =>
      moodValues.map(v => ({
        date: v.date.slice(5),
        fullDate: v.date,
        value: moodField ? numericValue(moodField, v.value) : null,
      })),
    [moodValues, moodField],
  )
  const moodByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of moodSeries) if (p.value !== null) map.set(p.fullDate, p.value)
    return map
  }, [moodSeries])
  const moodMin = moodField?.config.min ?? 1
  const moodMax = moodField?.config.max ?? 10
  const latestMood = moodSeries.length > 0 ? moodSeries[moodSeries.length - 1].value : null
  const recentMood = moodSeries.slice(-8, -1).map(p => p.value).filter((v): v is number => v !== null)

  const chartFields = activeFields.filter(f => f.show_in_charts && f.id !== moodField?.id)
  const overlayIndex = 3 + chartFields.length
  const medsIndex = overlayIndex + 1
  const streaksIndex = medsIndex + 1
  const comparisonsIndex = streaksIndex + 1
```

Replace the `{!loading && hasData && (<>…</>)}` block and the trailing sections with:

```tsx
      {!loading && hasData && (
        <>
          {moodField && moodSeries.length > 0 && (
            <Section index={1} title="Mood">
              <div className="flex flex-col items-center gap-4 pt-2">
                <MoodDial value={latestMood} min={moodMin} max={moodMax} recent={recentMood} />
              </div>
              <RhythmChart data={moodSeries} domain={[moodMin, moodMax]} isDark={isDark} />
              <CalendarHeatmap month={new Date()} valuesByDate={moodByDate} min={moodMin} max={moodMax} />
            </Section>
          )}
          {chronologicalLogs.length > 0 && <SleepChart logs={chronologicalLogs} isDark={isDark} />}
          {chartFields.map((f, i) => (
            <FieldChart key={f.id} field={f} values={valuesByField.get(f.id) ?? []} index={i + 3} isDark={isDark} />
          ))}
          <OverlaySection fields={activeFields} valuesByField={valuesByField} logs={chronologicalLogs} index={overlayIndex} isDark={isDark} />
          <MedAdherenceSection index={medsIndex} medications={medications} logs={medLogs365} />
        </>
      )}

      <StatsSection index={streaksIndex} {...streaks} />

      {!loading && hasData && (
        <CorrelationsSection
          fields={activeFields}
          valuesByField={valuesByField}
          logs={chronologicalLogs}
          index={comparisonsIndex}
          isDark={isDark}
        />
      )}
```

Also update the page header block: `font-serif text-3xl tracking-[-0.025em] text-ink` → `font-sans font-medium text-3xl tracking-[-0.025em] text-ink`, and the range pills: selected `bg-clay-tint text-clay-deep` → `bg-signal text-bg`, unselected stays `text-faint`; the pill container keeps `bg-surface border border-line rounded-full p-1`.

Add `Section` to the imports (`import { Section } from '../ui/Section'`). Remove the old FieldChart `.map` numbering from Task 4 if it conflicts — this block supersedes it.

Note: `StatsSection` and `CorrelationsSection` gain an `index: number` prop in Task 19; until then TypeScript will error — implement Task 19's prop additions together with this step if compiling in one pass, or temporarily omit the `index` props on those two and add them in Task 19. Prefer doing Tasks 18+19 in one working session.

- [ ] **Step 3: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass (after Task 19 props if needed)

- [ ] **Step 4: Visual check in browser**

Run `npm run dev`, open Charts/Insights in dark mode: dial glows and pulses, rhythm chart has gradient, heatmap cells reflect data, adherence strips render, markers numbered 01→07. Check light mode too. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: insights hero — mood dial, rhythm chart, heatmap, med adherence"
```

---

### Task 19: Overlay, Comparisons, and Streaks restyle

**Files:**
- Modify: `src/components/charts/OverlaySection.tsx`
- Modify: `src/components/charts/CorrelationsSection.tsx`
- Modify: `src/components/charts/StatsSection.tsx`

**Interfaces:**
- Consumes: Task 1 tokens, Task 5 `ChartTooltip`. Produces: `OverlaySection` and `CorrelationsSection` and `StatsSection` each accept a new required `index: number` prop (wired by ChartsPage in Task 18).

- [ ] **Step 1: `OverlaySection.tsx`**

- Add `index: number` to `Props`; `<Section title="Compare">` → `<Section index={index} title="Compare">`.
- Chips: `isOn` → `bg-signal text-bg border-signal`; off → `border-line text-ink hover:border-ink`. Add a dot indicator before the label: `<span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: COLORS[i % COLORS.length] }} />` (map over `available` with index `i`).
- `<Tooltip formatter={…}>` → `<Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />`. (The raw-value formatter is dropped; `ChartTooltip` shows the normalized % values. Keep `buildOverlayData` untouched.)
- `<Legend wrapperStyle={{ fontSize: 12 }} />` → `<Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono Variable' }} />`.
- Line props: add `strokeWidth={2}` and `dot={{ r: 2, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}`.
- Axes/grid: same treatment as Task 13 — `vertical={false}` grid, `tickLine={false}`, mono tick object.

- [ ] **Step 2: `CorrelationsSection.tsx`**

- Add `index: number` to `Props`; the `eyebrow` `<h2>Correlations</h2>` → `<h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">{String(index).padStart(2, '0')} / Comparisons</h2>` (drop the `eyebrow` import).
- Card container `bg-surface border border-line rounded-xl p-4 flex flex-col gap-3` → flat: `border-t border-line pt-4 flex flex-col gap-3` (no card boxes per spec).
- Summary line gains the split framing: `{result.groupA.label}: avg {result.groupA.avg} ({result.groupA.count} days) — {result.groupB.label}: avg {result.groupB.avg} ({result.groupB.count} days)` stays, but render it in `font-mono text-xs tnum text-muted`.
- `<Tooltip cursor={{ strokeDasharray: '3 3' }} />` → `<Tooltip content={<ChartTooltip />} />`.
- Scatter colors: `blue` variable rename to `signal` (= `CHART_COLORS.series[0]`); `gray` stays `barInactive`.
- Rename the local `const blue = CHART_COLORS.series[0]` to `const signalColor = CHART_COLORS.series[0]` for clarity.

- [ ] **Step 3: `StatsSection.tsx`**

- Add `index: number` to `Props`; the `eyebrow` `<h2>Streaks</h2>` → numbered marker same as Step 2 (`NN / Streaks`); drop the `eyebrow` import.
- `StreakCard` value: `<p className="font-serif text-3xl text-ink">{current}</p>` → `<p className="font-sans font-semibold text-3xl tnum text-ink">{current}</p>`; "Longest: N" → `font-mono text-xs tnum text-faint`; the label line already matches the mono spec.

- [ ] **Step 4: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: restyle overlay, comparisons, and streaks as instrument readouts"
```

---

### Task 20: Reminders + Auth sweep

**Files:**
- Modify: `src/components/reminders/RemindersPage.tsx`
- Modify: `src/components/auth/AuthPage.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `AuthDivider.tsx`, `VerifyEmailNotice.tsx` (`GoogleButton.tsx` — brand SVG hexes stay)

**Interfaces:**
- Consumes: Task 1 tokens, Task 3 helpers. Produces: unchanged APIs.

- [ ] **Step 1: Apply the Task 11 mapping table** to all files above (`clay*` → signal equivalents, `font-serif` → `font-sans font-medium`, italics dropped, scrims/shadows if any).

- [ ] **Step 2: Specific upgrades**

- `AuthPage.tsx` wordmark (~line 28): same treatment as AppShell — `font-sans font-medium text-xl` with `<span className="text-signal">.</span>`; remove the `<em>` italic.
- `RemindersPage.tsx`: the section heading (`eyebrow`) becomes a numbered marker `01 / Reminders`; reminder rows keep `bg-surface border border-line rounded-lg`; the dashed add-row stays dashed `border-line` with `hover:border-ink`.
- Inputs across auth: `border-line bg-surface placeholder-faint` stays valid; ensure focus ring is `focus:ring-signal` (via mapping).

- [ ] **Step 3: Verify no legacy classes remain anywhere**

Run: `grep -rn "clay\|font-serif\|bg-paper\|text-paper\|bg-black/50\|rgba(27,25,22" src/`
Expected: no matches

- [ ] **Step 4: Run tests + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: restyle reminders and auth to instrument theme"
```

---

### Task 21: Final verification, dependency cleanup, visual QA

**Files:**
- Modify: `package.json` (confirm old font packages are gone)
- Modify: any file still holding legacy references

- [ ] **Step 1: Dead-token sweep**

Run each and expect **no matches**:

```bash
grep -rn "clay" src/ package.json
grep -rn "font-serif" src/
grep -rn "archivo\|courier-prime\|fraunces\|geist" src/ package.json
grep -rn "rgba(27,25,22" src/
grep -rn "italic" src/
```

(Note: `package-lock.json` may still mention old packages transitively — ignore it; `package.json` must be clean.)

- [ ] **Step 2: Full gate**

Run: `npm run test && npm run lint && npm run build`
Expected: all pass

- [ ] **Step 3: Visual QA checklist (manual, `npm run dev`)**

- Dark mode loads by default (fresh `localStorage`); light inversion works via toggle and persists.
- Insights: dial pulse, rhythm gradient, heatmap opacities, adherence strips, themed tooltips on every chart, numbered markers 01→07 sequential.
- Today/History/Reminders/Auth: Clash Display headings, JetBrains Mono labels/metrics, signal accents, no serif, no italics, no leftover unstyled elements.
- Emulate `prefers-reduced-motion: reduce` (DevTools → Rendering): no breathing/pulse/reveal motion.
- Narrow viewport (~390px): bottom nav safe-area padding intact, no overlap with the iOS home indicator area (check `env(safe-area-inset-bottom)` still applied).
- Stop the dev server when done.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: instrument redesign final sweep and verification"
```

---

## Self-Review Notes

- **Spec coverage:** palette/typography/motion (T1, T3, T9, T10), numbered markers (T4, T19, T20), component restyles (T9–T12, T20), all ten viz items (T2, T5–T8, T13–T19), dark-first default (T10 Step 5), broken-tree repair (mapping sweeps T11/T12/T20 + dead-token gate T21), test updates for the 4 pinned tests (T2, T3, T4, T10), dependency cleanup (T1, T21).
- **Type consistency:** `Section`/`FieldChart`/`OverlaySection`/`StatsSection`/`CorrelationsSection` `index` props defined in T4/T18/T19 and consumed consistently; `ChartTooltip` props match recharts' injected `active/payload/label`; `buildMonthCells(month, valuesByDate, today?, min?, max?)` default params keep Task 7 tests valid while Task 17 passes `min`/`max`; `MoodDial.recent` excludes the latest value (T18 slices `slice(-8, -1)`).
- **Known flexibility points:** exact glyph styling inside TodayPage/HistoryPage may differ slightly from mapping table — the dead-token grep gate (T20 Step 3, T21 Step 1) is the arbiter, not line numbers.
