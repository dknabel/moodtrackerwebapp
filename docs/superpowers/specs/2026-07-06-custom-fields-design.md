# Custom Fields Design

**Date:** 2026-07-06
**Status:** Approved

## Overview

Make the daily log user-definable. Users create, edit, reorder, and archive their own trackable fields (e.g. stress, caffeine, meditated, triggers). The existing built-in metrics — mood, energy, anxiety, meals, exercise, gratitude — become pre-seeded custom fields that users can modify like any other. Sleep remains a special structured section because it is multi-part (bedtime, wake time, hours, quality) with derived calculations.

Charts update automatically: every chartable field gets a type-appropriate chart, and a new overlay picker lets users compare 2–3 numeric fields on one chart.

## Data model

### `custom_fields`

One row per field definition, per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → auth.users, RLS scope |
| `name` | text | display name, required, non-empty |
| `type` | text | `slider` \| `number` \| `toggle` \| `text` \| `tags` |
| `config` | jsonb | type-specific settings (see below) |
| `sort_order` | int | position on Today page and in charts |
| `active` | boolean | `false` = archived (hidden, history preserved) |
| `show_in_charts` | boolean | default `true`; per-field chart visibility toggle |
| `created_at` | timestamptz | |

`config` by type:

- `slider`: `{ "min": 1, "max": 10, "lowLabel": "…", "highLabel": "…" }`
- `number`: `{ "unit": "cups" }` (optional)
- `toggle`: `{}`
- `text`: `{}`
- `tags`: `{ "options": ["work", "family", …] }`

### `field_values`

One row per field per day, mirroring the `medication_logs` pattern.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | RLS scope |
| `field_id` | uuid | FK → custom_fields, `ON DELETE CASCADE` |
| `date` | date | `YYYY-MM-DD` |
| `value` | jsonb | `7`, `true`, `"note…"`, or `["tag1","tag2"]` |
| `created_at` | timestamptz | |

Unique constraint on `(field_id, date)`. Writes are upserts on that key.

RLS on both tables: users can select/insert/update/delete only rows where `user_id = auth.uid()`, matching the existing `daily_logs` and `medications` policies.

## Built-in unification & migration

1. A SQL migration seeds six default field definitions for **every existing user** (in `sort_order`): Mood (slider 1–10), Energy (slider 1–10), Anxiety (slider 1–10), Meals (number), Exercise (toggle), Gratitude (text).
2. The same migration backfills `field_values` from the corresponding `daily_logs` columns (`mood_rating`, `mood_energy`, `mood_anxiety`, `meals_count`, `exercised`, `gratitude`), skipping nulls. Runs in a transaction.
3. New users get the same six defaults seeded at first sign-in (client-side seed on first load when the user has zero fields; idempotent).
4. The old `daily_logs` columns are **kept but no longer written**, as a safety net. They are dropped in a later cleanup migration once the backfill is verified in production.
5. Sleep columns (`sleep_hours`, `sleep_quality`, `bedtime`, `wake_time`, `tonight_bedtime`) remain on `daily_logs` and keep their current section, hooks, and chart.

## Field editing semantics

- **Rename / relabel / reorder / reconfigure:** always allowed; takes effect everywhere immediately.
- **Type change:** allowed at any time. Historical `field_values` rows are never modified. Charts plot only values compatible with the current type (numbers for slider/number; booleans for toggle). Changing between numeric types loses nothing. Changing to an incompatible type (e.g. slider → text) shows a warning before saving: old values remain visible in History but drop off the chart.
- **Archive:** deleting a field that has any values sets `active = false`. Archived fields disappear from Today and Charts but their values still appear in History and exports. Archived fields can be reactivated from the manage screen.
- **Hard delete:** available from the manage screen with a typed confirmation ("delete field and all its data"); removes the definition and cascades to its values.
- **Validation:** field name required and unique per user (case-insensitive); slider requires `min < max`; tags requires at least one option.

## UI

### Today page

`TodayPage` renders: Sleep section (unchanged), then one section per active field ordered by `sort_order`, then Meds (unchanged). Each field section picks its widget by type:

- `slider` → existing `Slider` component with config labels
- `number` → numeric stepper (extracted from the meals UI)
- `toggle` → yes/no buttons (extracted from the exercise UI)
- `text` → textarea (like the gratitude UI)
- `tags` → tap-to-toggle chip row from `config.options`

Saving stays per-section: each save upserts one `field_values` row. Errors surface inline per section, matching current behavior.

### Manage fields screen

Modeled on `ManageMedsModal`: list of fields with add, edit (name/type/config), reorder (up/down), archive/reactivate, and hard delete. Reachable from the Today page.

## Charts

- **Auto chart per field:** slider/number → line chart over time; toggle → weekly frequency bars (like the current exercise chart); tags → tag frequency summary. `text` fields do not chart.
- **Chart visibility:** users can toggle each field's chart on/off (persisted as `custom_fields.show_in_charts`); charts follow field `sort_order`.
- **Overlay picker:** users select any 2–3 numeric series — custom slider/number fields plus sleep hours and sleep quality — to render on a single comparison line chart. Values are normalized to percent-of-range (slider: min→max; number: 0→observed max; sleep hours: 0→12) so different scales share one axis. Tooltip shows raw values.
- **Correlations:** the existing correlations section extends to all numeric and toggle fields automatically (toggle treated as 0/1), keeping the current minimum-data-point rules.

## History & export

- History entries render all field values recorded for that day (label + formatted value; tags as chips).
- CSV export becomes wide-format: one column per field (by current name), plus the sleep columns. Archived fields are included.
- PDF export includes the same field columns via jspdf-autotable.

## Error handling

- Field list fetch failure: Today page shows a retry state (matching existing `useSupabaseQuery` behavior); sleep and meds sections still work.
- Value save failure: inline error on the affected section, value not marked saved.
- Seed race (two tabs seeding defaults): idempotent seed guarded by a uniqueness check; duplicate inserts are ignored.

## Testing

- Hook tests: `useFields` (CRUD, ordering, archive), `useFieldValues` (upsert, date-range fetch), seeding idempotency.
- Lib tests: value coercion/compatibility rules (type-change semantics), overlay normalization math, correlations over custom fields.
- Component tests: each field-type widget, manage fields screen, Today page rendering from field definitions, warning flow on incompatible type change.
- Migration: verified against a copy of seeded data before deploy; old columns retained as rollback safety net.

## Out of scope (later phases)

- Full chart builder (saved named charts, custom date ranges)
- Dropping the legacy `daily_logs` columns (separate cleanup migration)
- Unifying sleep into the field system
- Reminders/notifications
