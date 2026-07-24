# UI Redesign: "The Journal" — Design Spec

**Date:** 2026-07-24
**Status:** Approved by user
**Scope:** Full visual redesign of the Mood Tracker+ web app, PWA, and Capacitor iOS/Android apps (one shared React codebase). Composition and framing may change; routes, features, and data do not.

## Goal

Replace the current default-Tailwind (gray/blue) look with a distinctive, warm-organic yet quiet-premium identity. Logging a day should feel like writing in a well-made journal, not filling in a form. The website and native apps are the same codebase, so one redesign covers all surfaces.

## Visual Identity

### Palette

Light mode:

| Token | Value | Use |
|---|---|---|
| `cream` | `#FAF9F6` | Page background |
| `paper` | `#FFFFFF` | Elevated surfaces (modals, nav) |
| `ink` | `#1B1916` | Primary text (never pure black) |
| `muted` | `#6B6359` | Secondary text |
| `faint` | `#9C9388` | Tertiary text |
| `clay` | `#E5604A` | Accent: interactive states, active nav, focus |
| `clay-deep` | `#C8472F` | Accent hover/pressed |
| `clay-tint` | `#FBE7E0` | Subtle highlight backgrounds |
| `line` | `#E6DFD3` | Hairline borders/dividers |

Dark mode: warm near-black (`#1B1916` base, slightly lifted surfaces), cream-tinted text ladder, same terracotta accent. No blue-grays.

Chart data palette: terracotta, olive, warm gold (curated set replacing default Recharts colors).

### Typography

- **Fraunces** (variable serif, self-hosted woff2) — headings, dates, and numbers that matter; tight tracking (-0.025em to -0.03em), large sizes.
- **Geometric sans** (self-hosted) — body copy and UI controls at small sizes.
- **Mono** (self-hosted) — eyebrow labels: uppercase, wide tracking (0.05–0.1em), 11–13px; used for section headers (`SLEEP`, `MEDICATIONS`, …).
- Fallback stacks: system serif / system sans for font-load failure.

**Signature detail:** key serif moments use an italic terracotta word (e.g., Today greeting: "Good *evening*"). Used sparingly.

### Material & motion

- Flat, paper-like surfaces. Sections separated by hairline borders + whitespace, not stacked gray cards.
- Soft warm-tinted shadows only where elements genuinely float (modals, bottom nav): e.g. `0 2px 8px rgba(27,25,22,0.04)`.
- Motion reserved for micro-interactions: hover lift 1–2px + shadow, 150–200ms ease. Respect `prefers-reduced-motion`. No scroll-triggered theatrics.

## Structure & Navigation

Four tabs remain (`Today`, `History`, `Charts`, `Reminders` — same routes), reframed as one coherent journal:

- **Today** — the center. A journal page: date set large in Fraunces as page header ("Friday, July 24"), italic-terracotta greeting beneath. Sections (mood fields, sleep, medications) become flat editorial sections: eyebrow label + hairline divider + content. No card boxes.
- **History → "Journal"** — past entries as dated pages: serif date headers, compact prose-like rendering, quiet text filters.
- **Charts → "Insights"** — big serif stat figures instead of stat cards; charts on cream with hairline warm grid lines and the curated data palette.
- **Reminders** — quiet settings page, same editorial treatment.

Chrome:

- Header wordmark "Mood Tracker" set in Fraunces with italic accent on one word. Theme toggle and sign-out remain, quieter styling.
- Bottom nav: hairline top border, terracotta active state (replacing blue), thinner icon strokes (~1.5), small mono uppercase labels.
- Desktop/web stays a centered single column journal measure (~680px max), same object as the app.

No route, feature, or data changes.

## Components

All shared controls rebuilt on tokens; logic untouched.

- **Buttons** — primary: terracotta pill, cream text; secondary: transparent, hairline border. Hover: 1–2px lift + soft warm shadow, 150–200ms.
- **Inputs** — hairline beige borders (underline-style where appropriate), terracotta focus ring. Keep existing iOS anti-zoom fix.
- **Sliders & steppers** — terracotta track/thumb on warm beige rail; steppers as hairline-bordered circles; key values in Fraunces.
- **Meds checkboxes** — custom rounded checkbox, terracotta check; checked doses get soft strikethrough/tint.
- **Cards → Sections** — `Card` replaced by a `Section` pattern (eyebrow label, hairline divider, whitespace). Elevated surfaces only for modals and bottom nav.
- **Modals** — cream surface, ~16px radius, serif titles, calm transitions.
- **Links** — 1px underline at 25% opacity → 100% on hover.
- **Skeletons & empty states** — warm beige shimmer; empty states use the italic-terracotta serif voice ("Nothing logged *yet*.").
- **Charts** — cream background, hairline warm grid, curated series colors, tooltip as small cream panel with hairline border.
- **Focus states** — one consistent terracotta focus ring everywhere; accessibility preserved.

## Implementation Approach

- **Single source of truth:** identity defined as Tailwind 4 `@theme` tokens in `src/index.css` (colors, fonts), dark mode via the existing `@custom-variant dark` class strategy. Components consume tokens, never raw hex.
- **Fonts self-hosted** as woff2 (Fraunces variable + sans + mono) bundled with the app — no runtime Google Fonts dependency; works offline in PWA and Capacitor.
- **Build order:** tokens & fonts → shared primitives (`Section`, buttons, inputs, slider, stepper, checkbox, focus ring) → shell (header + bottom nav) → Today → History → Charts → Reminders → Auth pages. Screen by screen; app fully working at each step.
- **No functional changes:** no route, data, or Supabase changes. Capacitor sync and Vercel deployment untouched.
- **Testing:** existing Vitest/RTL suite must stay green; tests query by role/label so most survive restyling — update any class-sensitive assertions. `npm run test`, `npm run lint`, and `npm run build` must pass before each screen is considered done. Visual verification in the browser as we go.
- **Edge cases:** iOS safe-area insets preserved; dark-mode class strategy unchanged; font fallback stacks; reduced-motion honored.

## Out of scope

- New features, new routes, data model or Supabase changes
- Marketing/landing site (the app itself is the website)
- Native (Swift/Kotlin) UI work — everything ships through the shared web UI
