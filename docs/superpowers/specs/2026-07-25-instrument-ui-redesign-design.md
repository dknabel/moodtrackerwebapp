# UI Redesign: "The Instrument" — Design Spec

**Date:** 2026-07-25
**Status:** Approved by user (fonts: Clash Display + JetBrains Mono)
**Scope:** Full visual redesign of the Mood Tracker+ web app, PWA, and Capacitor iOS/Android apps (one shared React codebase). Composition and framing change; routes, features, and data do not. Supersedes the unfinished token migration currently in the working tree (paper/ink/signal + Archivo/Courier Prime), which this redesign replaces wholesale.

## Goal

Replace the current look — a generic AI-startup editorial aesthetic — with a distinctive dark-first "precision instrument" identity suitable for a portfolio piece. The data visualizations become the visual identity: dials, readouts, glow, mono metrics. Minimalist and sleek, not loud. One shared codebase covers web, PWA, iOS, and Android.

## Visual Identity

### Palette

Dark mode is the primary face; light mode is a true inversion, not an afterthought.

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg` | `#0A0B0D` | `#F6F6F4` | Page canvas |
| `surface` | `#121316` | `#FFFFFF` | Modals, nav, tooltips, input fills |
| `line` | `#262A31` | `#E3E3DE` | 1px hairlines everywhere |
| `ink` | `#FBFBFB` | `#101012` | Primary text |
| `muted` | `#B8BCC4` | `#55575C` | Secondary text |
| `faint` | `#69707A` | `#9A9C9F` | Tertiary text |
| `signal` | `#FF9E40` | `#D9730F` | The one accent: active nav, focus rings, key data, primary buttons |
| `signal-soft` | signal at ~12% opacity | signal at ~14% opacity | Highlight fills behind signal moments |
| `pass` | `#5FA8C7` | `#3E7C99` | Positive status, secondary chart series |
| `warn` | `#D9A24A` | `#B07E2E` | Warning status, tertiary chart series |
| `danger` | `#D85C46` | `#B84A36` | Destructive actions, errors |

Chart series derive from this palette (signal, pass, warn) — the current disconnected terracotta `chartColors.ts` is rewritten to mirror these tokens for both themes.

### Typography

Two families, self-hosted as woff2 via fontsource (offline-safe for PWA/Capacitor):

- **Clash Display** (variable, `@fontsource-variable/clash-display`) — headlines, dates, dial readouts, big numerals at weights 500–700 with tight tracking; also body/UI text at quiet weights (400/500). No third body font.
- **JetBrains Mono** (`@fontsource/jetbrains-mono` 400/500/700) — all metrics, timestamps, axis ticks, tooltips, section markers, nav labels. Tabular numerals via the existing `tnum` utility applied everywhere numbers appear (it is currently defined but unused).

Removed: Archivo, Courier Prime, Fraunces, Geist, Geist Mono packages (dependency cleanup).

**Signature details:**
- Numbered section markers — `01 / SLEEP`, `02 / MOOD`, `03 / MEDICATIONS` — JetBrains Mono, uppercase, wide tracking, followed by a hairline rule. Replaces the current plain `meta-label` eyebrow.
- The mood dial (see Data Visualizations) as the app's visual mascot.

### Material & motion

- Flat dark surfaces. Depth through 1px hairlines and layering only — no card-in-card nesting, no heavy drop shadows.
- Glow replaces shadow for accent moments: layered `box-shadow` in signal at 10–36% opacity (e.g., `0 0 16px` / `0 0 32px` layers). Non-accent elevated surfaces (modals) use a single subtle dark shadow.
- Corner radii small and systematic: 4px (inputs, small chips), 8px (buttons, cards where needed), 12px (modals). Existing pill buttons may stay pill where already established.
- Motion is CSS-only and purposeful, gated behind `prefers-reduced-motion` (existing base-layer kill-switch preserved):
  - Staggered entrance reveals: `--ease-reveal: cubic-bezier(0.22,1,0.36,1)`, ~0.56s duration, 70ms stagger via per-child `transition-delay`
  - Breathing glow on primary buttons: ~3.4s ease-in-out box-shadow pulse
  - Dial pulse glow: ~3s ease-in-out drop-shadow pulse
  - Chart line draw-in on mount (stroke-dashoffset animation on hand-rolled SVG; recharts' built-in animation for recharts charts)
  - No scroll-triggered theatrics, no hover lifts with shadows; hover = glow intensify or border brighten

## Structure & Navigation

Routes, tabs, features, and data unchanged. Four tabs: Today, History, Charts, Reminders.

- **AppShell** — wordmark reset in Clash Display with a signal-accent glyph (no italic serif); theme toggle and sign-out kept, quieter styling; iOS safe-area padding preserved exactly (`pb-[calc(5rem+env(safe-area-inset-bottom))]` coupling with BottomNav height noted — nav height unchanged).
- **BottomNav** — hairline top rule, `surface` background, signal active state with a small glow dot indicator, JetBrains Mono uppercase labels, 1.5px lucide icon strokes.
- **Desktop/web** — centered ~680px single column, same object as mobile.

## Components

All shared controls rebuilt on tokens; logic untouched. Components consume tokens, never raw hex — this includes replacing the hard-coded modal shadows (`rgba(27,25,22,…)`), scrims (`bg-black/50` → `bg-black/60` + subtle backdrop blur), and all of `chartColors.ts`. GoogleButton's brand SVG hexes are the sole exception (brand-required).

- **Buttons** — primary: signal fill, near-black (`bg`-colored) text, breathing glow; secondary: transparent + hairline `line` border, border brightens on hover. No lift-and-shadow hovers.
- **Inputs** — hairline `line` borders on `surface`, signal focus ring (single consistent ring everywhere); time/number values in mono; existing iOS anti-zoom fix preserved.
- **Slider/Stepper** — signal track/thumb on `line` rail; current value in large JetBrains Mono numerals (replaces serif values); steppers as hairline-bordered circles without hover lift.
- **Checkboxes/meds** — hairline square, signal check; taken doses dim to `faint` with strikethrough.
- **Section** — rebuilt around numbered marker + hairline rule; elevated surfaces only for modals, nav, and tooltips.
- **Modals/bottom sheets** — `surface` + hairline `line` border + 12px radius (top-only for sheets); scrim `bg-black/60` with subtle backdrop blur.
- **Skeletons** — `surface`-on-`bg` shimmer (replaces warm `clay-tint` pulse).
- **Auth pages** — same instrument treatment: Clash Display wordmark, hairline inputs, signal primary button; Google button keeps brand SVG.
- **Empty states** — quiet mono voice, no serif italics.

## Data Visualizations

The heart of the redesign. All current charts live in `src/components/charts/` on recharts 3.8 with an outdated hard-coded palette and default white tooltips (which clash in dark mode). Plan:

1. **Mood dial (new, hero of Charts/Insights)** — circular hand-rolled SVG gauge: stroke-dasharray arc showing the latest value of the designated mood field against its configured scale; center readout in large Clash Display/JetBrains Mono numerals with delta vs. trailing 7-day average; soft signal pulse glow. No new dependencies.
2. **Mood rhythm chart** — the designated mood field promoted from a generic FieldChart to a smooth area chart: gradient signal glow under the line, visible data-point dots, themed tooltip, hairline grid. ("Designated mood field" = the first slider field, matching the existing CorrelationsSection convention; if a field is literally named "mood" it wins.)
3. **Calendar heatmap (new)** — month grid, one cell per day, mood value mapped to signal opacity (empty days = bare hairline cell). GitHub-style density view, fully on-theme. Pure bucketing/color-scale helpers, unit-tested.
4. **Sleep chart** — hours become slim bars (mono axis labels), quality stays a signal line; two distinct visual weights instead of two identical lines; custom tooltip; dual Y-axes kept.
5. **Field charts** — lines gain dots + themed tooltips; toggle fields switch from 8px bars to an adherence strip (one segment per day, signal = yes, hairline = no) with the existing "X/Y days" header; tags renderer keeps its HTML-bar structure, restyled with mono counts and token colors.
6. **Medication adherence (new)** — weekly strip per active med: taken/missed day segments in signal/hairline plus current streak count. The app's first medication visualization.
7. **Overlay (Compare)** — normalization logic (`src/lib/overlay.ts`, tested) unchanged; restyled with themed tooltip, signal-family series colors, refined legend chips with dot indicators.
8. **Correlations** — `src/lib/correlations.ts` logic unchanged (group comparisons, ≥3-per-group gate); restyled; labeling clarified to "above/below split" language instead of implying statistical correlation coefficients.
9. **StatsSection** — streaks as instrument readouts: oversized Clash Display numerals with mono labels, hairline rows.
10. **Shared themed tooltip** — one component (`surface` background, hairline border, mono values) replacing every recharts default Tooltip across all charts.
11. **`chartColors.ts` rewritten** — mirrors the CSS tokens as explicit light/dark maps (recharts needs real colors, not CSS vars, for SVG fills); `isDark` prop-drilling retained but simplified; the pinned `chartColors.test.ts` updated in the same commit.

## Implementation Approach

- **Single source of truth:** identity defined as Tailwind 4 `@theme` tokens in `src/index.css` (colors, fonts, easing vars); dark mode via the existing `@custom-variant dark` class strategy and ThemeProvider. Components consume tokens, never raw hex.
- **Build order** (app fully working and tests green at each step):
  1. Tokens + fonts in `index.css`; remove old font packages, add Clash Display + JetBrains Mono
  2. `chartColors.ts` rewrite + the 4 class-sensitive pinned tests updated (`styles.test.ts`, `Section.test.tsx`, `BottomNav.test.tsx`, `chartColors.test.ts`) — this also repairs the currently broken mid-migration working tree
  3. Shared primitives: Section (numbered marker), buttons, inputs, Slider, Stepper, checkbox, themed tooltip, skeletons
  4. Shell: AppShell + BottomNav
  5. Today (sections, sleep, fields, meds, modals)
  6. History (entries, export panel)
  7. Charts/Insights: token re-skin first, then new viz in order — mood dial, rhythm chart, calendar heatmap, adherence strips, sleep chart rebuild
  8. Reminders, then Auth pages
- **New viz** (dial, heatmap, adherence strips) as hand-rolled SVG + pure tested helper functions; no new runtime dependencies beyond the two font packages.
- **No functional changes:** no route, data, or Supabase changes. Capacitor sync and Vercel deployment untouched.
- **Testing:** existing Vitest/RTL suite must stay green; tests query by role/label so most survive restyling. New pure helpers (heatmap bucketing, dial arc math, adherence segments) get unit tests. `npm run test`, `npm run lint`, and `npm run build` must pass before each screen is considered done. Visual verification in the browser as we go.
- **Edge cases preserved:** iOS safe-area insets, dark-mode class strategy, font fallback stacks (system sans/mono), reduced-motion, iOS anti-zoom, BottomNav height ↔ AppShell bottom-padding coupling.

## Out of scope

- New features, new routes, data model or Supabase changes
- Marketing/landing site (the app itself is the website)
- Native (Swift/Kotlin) UI work — everything ships through the shared web UI
