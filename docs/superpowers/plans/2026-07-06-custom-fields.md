# Custom Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the daily log user-definable: users create/edit/reorder/archive their own trackable fields; the six built-ins (Mood, Energy, Anxiety, Meals, Exercise, Gratitude) become seeded editable fields; charts, correlations, history, and export follow the user's field list automatically.

**Architecture:** Two new Supabase tables — `custom_fields` (definitions) and `field_values` (one row per field per day, mirroring the existing `medication_logs` pattern). A migration seeds the six defaults for existing users and backfills history from the legacy `daily_logs` columns; those columns stay but are never written again. Sleep remains a special structured section on `daily_logs`. All aggregation (charts, correlations, streaks) stays client-side, as today.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (`@supabase/supabase-js`), Recharts, Tailwind 4, Vitest + Testing Library. Spec: `docs/superpowers/specs/2026-07-06-custom-fields-design.md`.

## Global Constraints

- No new dependencies — use only what's in `package.json`.
- Every new table gets RLS: `for all using (auth.uid() = user_id)`, matching `supabase/migrations/001_medications.sql`.
- Legacy `daily_logs` columns (`mood_rating`, `mood_energy`, `mood_anxiety`, `meals_count`, `exercised`, `gratitude`) are **kept but never written** after this feature; sleep columns stay in active use.
- Field types: exactly `'slider' | 'number' | 'toggle' | 'text' | 'tags'`.
- Field validation: name required and unique per user (case-insensitive); slider `min < max`; tags need ≥ 1 option.
- Correlation minimum data points stays 3 per group.
- Follow existing code style: hooks return `Promise<string | null>` for mutations (null = success), `useSupabaseQuery` for fetches, Tailwind classes matching neighboring components (dark-mode variants included).
- Run a task's tests with `npx vitest run <path>`; full suite with `npm test`; type-check with `npm run build`.

## File Structure

```
supabase/migrations/002_custom_fields.sql        (new — tables, RLS, seed, backfill)
src/lib/database.types.ts                        (modify — CustomField, FieldValue types)
src/lib/fields.ts                                (new — defaults, value helpers, validation)
src/lib/overlay.ts                               (new — overlay normalization)
src/lib/correlations.ts                          (rewrite — generic points instead of DailyLog)
src/lib/exportData.ts                            (modify — fetch fields + values)
src/lib/export.ts                                (rewrite — dynamic field columns)
src/hooks/useFields.ts                           (new — field CRUD + seeding)
src/hooks/useFieldValues.ts                      (new — per-date values + bulk save)
src/hooks/useFieldValuesBulk.ts                  (new — date-range fetch)
src/hooks/useStreaks.ts                          (modify — logging/toggle streaks from field values)
src/components/ui/Stepper.tsx                    (new — extracted from FoodSection)
src/components/today/FieldSection.tsx            (new — widget per field type)
src/components/today/ManageFieldsModal.tsx       (new — modeled on ManageMedsModal)
src/components/today/TodayPage.tsx               (rewrite — render sections from field list)
src/components/today/{Mood,Food,Exercise,Gratitude}Section.tsx  (delete + their tests)
src/components/charts/FieldChart.tsx             (new — auto chart per field type)
src/components/charts/OverlaySection.tsx         (new — 2–3 series comparison)
src/components/charts/ChartsPage.tsx             (rewrite — field-driven charts)
src/components/charts/{Mood,Meals,Exercise}Chart.tsx            (delete)
src/components/charts/StatsSection.tsx           (modify — dynamic streak cards)
src/components/charts/CorrelationsSection.tsx    (rewrite — dynamic configs)
src/components/history/HistoryPage.tsx           (modify — fetch fields + values)
src/components/history/HistoryEntry.tsx          (rewrite — render field values)
```

---

### Task 1: Schema migration and types

**Files:**
- Create: `supabase/migrations/002_custom_fields.sql`
- Modify: `src/lib/database.types.ts`

**Interfaces:**
- Produces: `CustomField`, `CustomFieldInsert`, `FieldValue`, `FieldType`, `FieldConfig`, `FieldValueData` types consumed by every later task.
- Produces: DB tables `custom_fields` and `field_values` with `unique(field_id, date)` — upserts later use `onConflict: 'field_id,date'`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/002_custom_fields.sql`:

```sql
create table custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('slider', 'number', 'toggle', 'text', 'tags')),
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true,
  show_in_charts boolean not null default true,
  created_at timestamptz not null default now()
);

alter table custom_fields enable row level security;
create policy "Users manage own custom fields"
  on custom_fields for all
  using (auth.uid() = user_id);

create table field_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_id uuid not null references custom_fields(id) on delete cascade,
  date date not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  unique(field_id, date)
);

create index field_values_user_date on field_values (user_id, date);

alter table field_values enable row level security;
create policy "Users manage own field values"
  on field_values for all
  using (auth.uid() = user_id);

-- Seed the six default fields for every existing user.
with defaults(name, type, config, sort_order) as (
  values
    ('Mood',      'slider', '{"min":1,"max":10}'::jsonb, 0),
    ('Energy',    'slider', '{"min":1,"max":10}'::jsonb, 1),
    ('Anxiety',   'slider', '{"min":1,"max":10}'::jsonb, 2),
    ('Meals',     'number', '{}'::jsonb,                 3),
    ('Exercise',  'toggle', '{}'::jsonb,                 4),
    ('Gratitude', 'text',   '{}'::jsonb,                 5)
)
insert into custom_fields (user_id, name, type, config, sort_order)
select u.id, d.name, d.type, d.config, d.sort_order
from auth.users u
cross join defaults d;

-- Backfill history from the legacy daily_logs columns (skip nulls).
insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.mood_rating)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Mood'
where l.mood_rating is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.mood_energy)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Energy'
where l.mood_energy is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.mood_anxiety)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Anxiety'
where l.mood_anxiety is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.meals_count)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Meals'
where l.meals_count is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.exercised)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Exercise'
where l.exercised is not null;

insert into field_values (user_id, field_id, date, value)
select l.user_id, f.id, l.date, to_jsonb(l.gratitude)
from daily_logs l join custom_fields f on f.user_id = l.user_id and f.name = 'Gratitude'
where l.gratitude is not null and l.gratitude <> '';
```

Note: the `join ... f.name = 'Mood'` lookups are safe because this same migration just created those rows; nothing else can have created same-named fields yet. Supabase CLI runs each migration file in a single transaction.

- [ ] **Step 2: Add the TypeScript types**

Append to `src/lib/database.types.ts`:

```ts
export type FieldType = 'slider' | 'number' | 'toggle' | 'text' | 'tags'

export interface FieldConfig {
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  unit?: string
  options?: string[]
}

export type FieldValueData = number | boolean | string | string[]

export interface CustomField {
  id: string
  user_id: string
  name: string
  type: FieldType
  config: FieldConfig
  sort_order: number
  active: boolean
  show_in_charts: boolean
  created_at: string
}

export type CustomFieldInsert = Omit<CustomField, 'id' | 'created_at'>

export interface FieldValue {
  id: string
  user_id: string
  field_id: string
  date: string               // 'YYYY-MM-DD'
  value: FieldValueData
  created_at: string
}

export type FieldValueUpsert = Omit<FieldValue, 'id' | 'created_at'>
```

- [ ] **Step 3: Verify types compile**

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 4: Apply the migration**

Run: `npx supabase db push` if the repo is linked to the Supabase project; otherwise paste the SQL into the Supabase dashboard SQL editor and run it. Verify with a quick query: `select count(*) from custom_fields;` — expect (number of users × 6).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/002_custom_fields.sql src/lib/database.types.ts
git commit -m "feat: add custom_fields and field_values schema with seed + backfill"
```

---

### Task 2: Field helpers library

**Files:**
- Create: `src/lib/fields.ts`
- Test: `src/lib/fields.test.ts`

**Interfaces:**
- Consumes: types from Task 1.
- Produces (all exported from `src/lib/fields.ts`):
  - `interface FieldData { name: string; type: FieldType; config: FieldConfig }`
  - `DEFAULT_FIELDS: FieldData[]` (the six seeded defaults, in order)
  - `defaultFieldValue(field: Pick<CustomField, 'type' | 'config'>): FieldValueData`
  - `isCompatibleValue(type: FieldType, value: FieldValueData): boolean`
  - `numericValue(field: Pick<CustomField, 'type'>, value: FieldValueData | null | undefined): number | null`
  - `displayValue(field: Pick<CustomField, 'type' | 'config'>, value: FieldValueData): string`
  - `isCompatibleTypeChange(from: FieldType, to: FieldType): boolean`
  - `isEmptyValue(value: FieldValueData): boolean`
  - `validateField(data: FieldData, existingNames: string[]): string | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/fields.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FIELDS, defaultFieldValue, isCompatibleValue, numericValue,
  displayValue, isCompatibleTypeChange, isEmptyValue, validateField,
} from './fields'

describe('DEFAULT_FIELDS', () => {
  it('defines the six built-ins in order', () => {
    expect(DEFAULT_FIELDS.map(f => f.name)).toEqual(
      ['Mood', 'Energy', 'Anxiety', 'Meals', 'Exercise', 'Gratitude']
    )
  })
})

describe('defaultFieldValue', () => {
  it('uses the slider midpoint (floored)', () => {
    expect(defaultFieldValue({ type: 'slider', config: { min: 1, max: 10 } })).toBe(5)
  })
  it('defaults number to 0, toggle to false, text to "", tags to []', () => {
    expect(defaultFieldValue({ type: 'number', config: {} })).toBe(0)
    expect(defaultFieldValue({ type: 'toggle', config: {} })).toBe(false)
    expect(defaultFieldValue({ type: 'text', config: {} })).toBe('')
    expect(defaultFieldValue({ type: 'tags', config: { options: ['a'] } })).toEqual([])
  })
})

describe('isCompatibleValue', () => {
  it('matches value shape to type', () => {
    expect(isCompatibleValue('slider', 7)).toBe(true)
    expect(isCompatibleValue('slider', 'seven')).toBe(false)
    expect(isCompatibleValue('toggle', true)).toBe(true)
    expect(isCompatibleValue('toggle', 1)).toBe(false)
    expect(isCompatibleValue('text', 'hi')).toBe(true)
    expect(isCompatibleValue('tags', ['a'])).toBe(true)
    expect(isCompatibleValue('tags', 'a')).toBe(false)
  })
})

describe('numericValue', () => {
  it('returns numbers for slider/number, 0/1 for toggle, null otherwise', () => {
    expect(numericValue({ type: 'slider' }, 7)).toBe(7)
    expect(numericValue({ type: 'number' }, 3)).toBe(3)
    expect(numericValue({ type: 'toggle' }, true)).toBe(1)
    expect(numericValue({ type: 'toggle' }, false)).toBe(0)
    expect(numericValue({ type: 'slider' }, 'old text')).toBeNull()
    expect(numericValue({ type: 'text' }, 'hi')).toBeNull()
    expect(numericValue({ type: 'slider' }, null)).toBeNull()
  })
})

describe('displayValue', () => {
  it('formats each type', () => {
    expect(displayValue({ type: 'slider', config: { min: 1, max: 10 } }, 7)).toBe('7/10')
    expect(displayValue({ type: 'number', config: { unit: 'cups' } }, 3)).toBe('3 cups')
    expect(displayValue({ type: 'number', config: {} }, 3)).toBe('3')
    expect(displayValue({ type: 'toggle', config: {} }, true)).toBe('Yes')
    expect(displayValue({ type: 'toggle', config: {} }, false)).toBe('No')
    expect(displayValue({ type: 'text', config: {} }, 'grateful')).toBe('grateful')
    expect(displayValue({ type: 'tags', config: {} }, ['work', 'family'])).toBe('work, family')
  })
  it('returns empty string for a value incompatible with the current type', () => {
    expect(displayValue({ type: 'slider', config: {} }, 'was text')).toBe('')
  })
})

describe('isCompatibleTypeChange', () => {
  it('treats slider and number as interchangeable; everything else only with itself', () => {
    expect(isCompatibleTypeChange('slider', 'number')).toBe(true)
    expect(isCompatibleTypeChange('number', 'slider')).toBe(true)
    expect(isCompatibleTypeChange('slider', 'slider')).toBe(true)
    expect(isCompatibleTypeChange('slider', 'text')).toBe(false)
    expect(isCompatibleTypeChange('toggle', 'number')).toBe(false)
  })
})

describe('isEmptyValue', () => {
  it('treats empty string and empty array as empty; 0 and false are not', () => {
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
    expect(isEmptyValue('x')).toBe(false)
  })
})

describe('validateField', () => {
  const slider = (over = {}) => ({ name: 'Stress', type: 'slider' as const, config: { min: 1, max: 10 }, ...over })
  it('accepts a valid field', () => {
    expect(validateField(slider(), ['Mood'])).toBeNull()
  })
  it('rejects blank names', () => {
    expect(validateField(slider({ name: '  ' }), [])).toBe('Name is required')
  })
  it('rejects duplicate names case-insensitively', () => {
    expect(validateField(slider({ name: 'mood' }), ['Mood'])).toBe('A field with this name already exists')
  })
  it('rejects slider with min >= max', () => {
    expect(validateField(slider({ config: { min: 5, max: 5 } }), [])).toBe('Slider minimum must be less than maximum')
  })
  it('rejects tags with no options', () => {
    expect(validateField({ name: 'Triggers', type: 'tags', config: { options: [] } }, []))
      .toBe('Add at least one tag option')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/fields.test.ts`
Expected: FAIL — module `./fields` not found.

- [ ] **Step 3: Implement**

Create `src/lib/fields.ts`:

```ts
import type { CustomField, FieldConfig, FieldType, FieldValueData } from './database.types'

export interface FieldData {
  name: string
  type: FieldType
  config: FieldConfig
}

/** The six built-ins seeded for every user; must match the 002 migration. */
export const DEFAULT_FIELDS: FieldData[] = [
  { name: 'Mood', type: 'slider', config: { min: 1, max: 10 } },
  { name: 'Energy', type: 'slider', config: { min: 1, max: 10 } },
  { name: 'Anxiety', type: 'slider', config: { min: 1, max: 10 } },
  { name: 'Meals', type: 'number', config: {} },
  { name: 'Exercise', type: 'toggle', config: {} },
  { name: 'Gratitude', type: 'text', config: {} },
]

export function defaultFieldValue(field: Pick<CustomField, 'type' | 'config'>): FieldValueData {
  switch (field.type) {
    case 'slider': {
      const min = field.config.min ?? 1
      const max = field.config.max ?? 10
      return Math.floor((min + max) / 2)
    }
    case 'number': return 0
    case 'toggle': return false
    case 'text': return ''
    case 'tags': return []
  }
}

export function isCompatibleValue(type: FieldType, value: FieldValueData): boolean {
  switch (type) {
    case 'slider':
    case 'number': return typeof value === 'number'
    case 'toggle': return typeof value === 'boolean'
    case 'text': return typeof value === 'string'
    case 'tags': return Array.isArray(value)
  }
}

/** Numeric reading of a value for charts/correlations; null if not chartable. */
export function numericValue(
  field: Pick<CustomField, 'type'>,
  value: FieldValueData | null | undefined
): number | null {
  if (value == null) return null
  if ((field.type === 'slider' || field.type === 'number') && typeof value === 'number') return value
  if (field.type === 'toggle' && typeof value === 'boolean') return value ? 1 : 0
  return null
}

export function displayValue(
  field: Pick<CustomField, 'type' | 'config'>,
  value: FieldValueData
): string {
  if (!isCompatibleValue(field.type, value)) return ''
  switch (field.type) {
    case 'slider': return `${value}/${field.config.max ?? 10}`
    case 'number': return field.config.unit ? `${value} ${field.config.unit}` : String(value)
    case 'toggle': return value ? 'Yes' : 'No'
    case 'text': return value as string
    case 'tags': return (value as string[]).join(', ')
  }
}

export function isCompatibleTypeChange(from: FieldType, to: FieldType): boolean {
  const numeric = (t: FieldType) => t === 'slider' || t === 'number'
  return from === to || (numeric(from) && numeric(to))
}

export function isEmptyValue(value: FieldValueData): boolean {
  return value === '' || (Array.isArray(value) && value.length === 0)
}

export function validateField(data: FieldData, existingNames: string[]): string | null {
  const name = data.name.trim()
  if (!name) return 'Name is required'
  if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) {
    return 'A field with this name already exists'
  }
  if (data.type === 'slider' && (data.config.min ?? 1) >= (data.config.max ?? 10)) {
    return 'Slider minimum must be less than maximum'
  }
  if (data.type === 'tags' && (data.config.options ?? []).length === 0) {
    return 'Add at least one tag option'
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/fields.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/fields.ts src/lib/fields.test.ts
git commit -m "feat: add field type helpers and validation"
```

---

### Task 3: useFields hook

**Files:**
- Create: `src/hooks/useFields.ts`
- Test: `src/hooks/useFields.test.ts`

**Interfaces:**
- Consumes: `useSupabaseQuery` (`src/hooks/useSupabaseQuery.ts`), `DEFAULT_FIELDS`, `FieldData` from Task 2.
- Produces: `useFields(): { fields: CustomField[]; activeFields: CustomField[]; loading: boolean; error: string | null; addField(data: FieldData): Promise<string | null>; updateField(id: string, data: FieldData & { show_in_charts?: boolean }): Promise<string | null>; archiveField(id: string): Promise<string | null>; reactivateField(id: string): Promise<string | null>; deleteField(id: string): Promise<string | null>; moveField(id: string, direction: -1 | 1): Promise<string | null> }`
- `fields` = all rows sorted by `sort_order`; `activeFields` = `fields.filter(f => f.active)`.
- First fetch seeds `DEFAULT_FIELDS` when the user has zero rows (insert errors ignored — a concurrent tab may have seeded; the refetch wins either way).

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useFields.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFields } from './useFields'
import type { CustomField } from '../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})
const mood = field({})
const energy = field({ id: 'f2', name: 'Energy', sort_order: 1 })

const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect, then: (r: (x: unknown) => void) => r({ error: null }) }))
const mockUpdateSingle = vi.fn()
let updateEqResponse: { data: unknown; error: { message: string } | null }
const mockUpdateEq = vi.fn(() => ({
  select: vi.fn(() => ({ single: mockUpdateSingle })),
  then: (resolve: (r: typeof updateEqResponse) => void) => resolve(updateEqResponse),
}))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
let deleteEqResponse: { error: { message: string } | null }
const mockDeleteEq = vi.fn(() => ({
  then: (resolve: (r: typeof deleteEqResponse) => void) => resolve(deleteEqResponse),
}))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete,
    })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockOrder.mockResolvedValue({ data: [mood, energy], error: null })
  updateEqResponse = { data: null, error: null }
  deleteEqResponse = { error: null }
})

describe('useFields', () => {
  it('fetches fields sorted by sort_order', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fields).toEqual([mood, energy])
  })

  it('activeFields excludes archived fields', async () => {
    const archived = field({ id: 'f3', name: 'Old', active: false, sort_order: 2 })
    mockOrder.mockResolvedValue({ data: [mood, archived], error: null })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeFields).toEqual([mood])
    expect(result.current.fields).toHaveLength(2)
  })

  it('seeds the six defaults when the user has no fields, then refetches', async () => {
    mockOrder
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [mood], error: null })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Mood', type: 'slider', user_id: 'u1', sort_order: 0 }),
        expect.objectContaining({ name: 'Gratitude', type: 'text', sort_order: 5 }),
      ])
    )
    expect(result.current.fields).toEqual([mood])
  })

  it('addField inserts with next sort_order and appends', async () => {
    const stress = field({ id: 'f9', name: 'Stress', sort_order: 2 })
    mockInsertSingle.mockResolvedValue({ data: stress, error: null })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let returned: string | null = 'sentinel'
    await act(async () => {
      returned = await result.current.addField({ name: 'Stress', type: 'slider', config: { min: 1, max: 10 } })
    })
    expect(returned).toBeNull()
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Stress', user_id: 'u1', sort_order: 2, active: true, show_in_charts: true })
    )
    expect(result.current.fields).toContainEqual(stress)
  })

  it('archiveField sets active false and keeps the row in fields', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.archiveField('f1') })
    expect(mockUpdate).toHaveBeenCalledWith({ active: false })
    expect(result.current.activeFields).toEqual([energy])
    expect(result.current.fields).toHaveLength(2)
  })

  it('deleteField removes the row from state', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.deleteField('f1') })
    expect(mockDelete).toHaveBeenCalled()
    expect(result.current.fields).toEqual([energy])
  })

  it('moveField swaps sort_order with the neighbor', async () => {
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.moveField('f2', -1) })
    expect(result.current.fields.map(f => f.id)).toEqual(['f2', 'f1'])
  })

  it('updateField surfaces errors and keeps state', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'nope' } })
    const { result } = renderHook(() => useFields())
    await waitFor(() => expect(result.current.loading).toBe(false))
    let returned: string | null = null
    await act(async () => {
      returned = await result.current.updateField('f1', { name: 'X', type: 'slider', config: {} })
    })
    expect(returned).toBe('nope')
    expect(result.current.fields).toEqual([mood, energy])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useFields.test.ts`
Expected: FAIL — module `./useFields` not found.

- [ ] **Step 3: Implement**

Create `src/hooks/useFields.ts`:

```ts
import { supabase } from '../lib/supabase'
import type { CustomField } from '../lib/database.types'
import { DEFAULT_FIELDS, type FieldData } from '../lib/fields'
import { useSupabaseQuery } from './useSupabaseQuery'

const fetchAll = () =>
  supabase.from('custom_fields').select('*').order('sort_order', { ascending: true })

/** Fetch all fields; a brand-new user gets the six defaults seeded first. */
async function fetchFieldsSeedingDefaults() {
  const first = await fetchAll()
  if (first.error || (first.data && first.data.length > 0)) return first
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return first
  const userId = auth.user.id
  // Insert errors are ignored: a concurrent tab may have seeded already,
  // and the refetch below returns whatever won.
  await supabase.from('custom_fields').insert(
    DEFAULT_FIELDS.map((d, i) => ({
      ...d, user_id: userId, sort_order: i, active: true, show_in_charts: true,
    }))
  )
  return fetchAll()
}

export function useFields() {
  const { data, loading, error, mutate } = useSupabaseQuery<CustomField[]>(
    'custom_fields:all',
    fetchFieldsSeedingDefaults
  )

  const fields = data ?? []

  const addField = async (fieldData: FieldData): Promise<string | null> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'Not authenticated'
    const nextOrder = fields.length === 0 ? 0 : Math.max(...fields.map(f => f.sort_order)) + 1
    const { data: inserted, error } = await supabase
      .from('custom_fields')
      .insert({ ...fieldData, user_id: auth.user.id, sort_order: nextOrder, active: true, show_in_charts: true })
      .select()
      .single()
    if (error) return error.message
    if (inserted) mutate(f => [...(f ?? []), inserted])
    return null
  }

  const updateField = async (
    id: string,
    fieldData: FieldData & { show_in_charts?: boolean }
  ): Promise<string | null> => {
    const { data: updated, error } = await supabase
      .from('custom_fields')
      .update(fieldData)
      .eq('id', id)
      .select()
      .single()
    if (error) return error.message
    if (updated) mutate(f => (f ?? []).map(fl => (fl.id === id ? updated : fl)))
    return null
  }

  const setActive = async (id: string, active: boolean): Promise<string | null> => {
    const { error } = await supabase.from('custom_fields').update({ active }).eq('id', id)
    if (error) return error.message
    mutate(f => (f ?? []).map(fl => (fl.id === id ? { ...fl, active } : fl)))
    return null
  }

  const archiveField = (id: string) => setActive(id, false)
  const reactivateField = (id: string) => setActive(id, true)

  const deleteField = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('custom_fields').delete().eq('id', id)
    if (error) return error.message
    mutate(f => (f ?? []).filter(fl => fl.id !== id))
    return null
  }

  const moveField = async (id: string, direction: -1 | 1): Promise<string | null> => {
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(f => f.id === id)
    const neighbor = sorted[idx + direction]
    if (idx === -1 || !neighbor) return null
    const current = sorted[idx]
    const [resA, resB] = await Promise.all([
      supabase.from('custom_fields').update({ sort_order: neighbor.sort_order }).eq('id', current.id),
      supabase.from('custom_fields').update({ sort_order: current.sort_order }).eq('id', neighbor.id),
    ])
    const error = resA.error ?? resB.error
    if (error) return error.message
    mutate(f => (f ?? [])
      .map(fl => fl.id === current.id
        ? { ...fl, sort_order: neighbor.sort_order }
        : fl.id === neighbor.id ? { ...fl, sort_order: current.sort_order } : fl)
      .sort((a, b) => a.sort_order - b.sort_order))
    return null
  }

  return {
    fields,
    activeFields: fields.filter(f => f.active),
    loading,
    error,
    addField,
    updateField,
    archiveField,
    reactivateField,
    deleteField,
    moveField,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useFields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFields.ts src/hooks/useFields.test.ts
git commit -m "feat: add useFields hook with default seeding and CRUD"
```

---

### Task 4: Field value hooks

**Files:**
- Create: `src/hooks/useFieldValues.ts`
- Create: `src/hooks/useFieldValuesBulk.ts`
- Test: `src/hooks/useFieldValues.test.ts`

**Interfaces:**
- Consumes: `isEmptyValue` from Task 2, `FieldValue`, `FieldValueData` types.
- Produces:
  - `useFieldValues(date: string): { values: Record<string, FieldValueData>; loading: boolean; error: string | null; saveAll(next: Record<string, FieldValueData>): Promise<{ error: string | null }> }` — `values` keyed by `field_id`.
  - `useFieldValuesBulk(fromDate: string, toDate: string): { values: FieldValue[]; loading: boolean; error: string | null }`
- `saveAll` semantics: upsert every non-empty entry (`onConflict: 'field_id,date'`); delete rows for field ids whose stored value existed but is now empty (`''`/`[]`). Numbers and booleans always upsert (0/false are real readings).

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/useFieldValues.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFieldValues } from './useFieldValues'

const v1 = { id: 'v1', user_id: 'u1', field_id: 'f1', date: '2026-07-06', value: 7, created_at: '' }
const v2 = { id: 'v2', user_id: 'u1', field_id: 'f2', date: '2026-07-06', value: 'note', created_at: '' }

const mockEqFetch = vi.fn()
const mockSelect = vi.fn(() => ({ eq: mockEqFetch }))
let upsertResponse: { error: { message: string } | null }
const mockUpsert = vi.fn(() => Promise.resolve(upsertResponse))
let deleteResponse: { error: { message: string } | null }
const mockDeleteEqDate = vi.fn(() => Promise.resolve(deleteResponse))
const mockDeleteIn = vi.fn(() => ({ eq: mockDeleteEqDate }))
const mockDelete = vi.fn(() => ({ in: mockDeleteIn }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: mockSelect, upsert: mockUpsert, delete: mockDelete })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockEqFetch.mockResolvedValue({ data: [v1, v2], error: null })
  upsertResponse = { error: null }
  deleteResponse = { error: null }
})

describe('useFieldValues', () => {
  it('maps fetched rows by field_id', async () => {
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.values).toEqual({ f1: 7, f2: 'note' })
  })

  it('saveAll upserts non-empty values with onConflict field_id,date', async () => {
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.saveAll({ f1: 8, f2: 'note', f3: false })
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      [
        { user_id: 'u1', field_id: 'f1', date: '2026-07-06', value: 8 },
        { user_id: 'u1', field_id: 'f2', date: '2026-07-06', value: 'note' },
        { user_id: 'u1', field_id: 'f3', date: '2026-07-06', value: false },
      ],
      { onConflict: 'field_id,date' }
    )
    expect(mockDelete).not.toHaveBeenCalled()
    expect(result.current.values.f1).toBe(8)
  })

  it('saveAll deletes rows whose stored value was emptied', async () => {
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.saveAll({ f1: 7, f2: '' })
    })
    expect(mockDeleteIn).toHaveBeenCalledWith('field_id', ['f2'])
    expect(result.current.values).toEqual({ f1: 7 })
  })

  it('saveAll skips empty values that were never stored', async () => {
    mockEqFetch.mockResolvedValue({ data: [v1], error: null })
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.saveAll({ f1: 7, f9: '' })
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('saveAll surfaces upsert errors', async () => {
    upsertResponse = { error: { message: 'RLS violation' } }
    const { result } = renderHook(() => useFieldValues('2026-07-06'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let returned: { error: string | null } = { error: null }
    await act(async () => {
      returned = await result.current.saveAll({ f1: 8 })
    })
    expect(returned.error).toBe('RLS violation')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useFieldValues.test.ts`
Expected: FAIL — module `./useFieldValues` not found.

- [ ] **Step 3: Implement both hooks**

Create `src/hooks/useFieldValues.ts`:

```ts
import { supabase } from '../lib/supabase'
import type { FieldValue, FieldValueData } from '../lib/database.types'
import { isEmptyValue } from '../lib/fields'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useFieldValues(date: string) {
  const { data, loading, error, mutate } = useSupabaseQuery<FieldValue[]>(
    `field_values:${date}`,
    () => supabase.from('field_values').select('*').eq('date', date)
  )

  const values: Record<string, FieldValueData> = {}
  for (const row of data ?? []) values[row.field_id] = row.value

  const saveAll = async (
    next: Record<string, FieldValueData>
  ): Promise<{ error: string | null }> => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { error: 'Not authenticated' }
    const userId = auth.user.id

    const rows = Object.entries(next)
      .filter(([, value]) => !isEmptyValue(value))
      .map(([field_id, value]) => ({ user_id: userId, field_id, date, value }))
    const emptied = Object.entries(next)
      .filter(([field_id, value]) => isEmptyValue(value) && field_id in values)
      .map(([field_id]) => field_id)

    if (rows.length > 0) {
      const { error } = await supabase
        .from('field_values')
        .upsert(rows, { onConflict: 'field_id,date' })
      if (error) return { error: error.message }
    }
    if (emptied.length > 0) {
      const { error } = await supabase
        .from('field_values')
        .delete()
        .in('field_id', emptied)
        .eq('date', date)
      if (error) return { error: error.message }
    }

    mutate(prev => {
      const kept = (prev ?? []).filter(
        v => !(v.field_id in next) || (!isEmptyValue(next[v.field_id]) )
      )
      const byId = new Map(kept.map(v => [v.field_id, v]))
      for (const row of rows) {
        const existing = byId.get(row.field_id)
        byId.set(row.field_id, existing
          ? { ...existing, value: row.value }
          : { id: `local:${row.field_id}`, created_at: '', ...row })
      }
      return Array.from(byId.values())
    })
    return { error: null }
  }

  return { values, loading, error, saveAll }
}
```

Create `src/hooks/useFieldValuesBulk.ts`:

```ts
import { supabase } from '../lib/supabase'
import type { FieldValue } from '../lib/database.types'
import { useSupabaseQuery } from './useSupabaseQuery'

export function useFieldValuesBulk(fromDate: string, toDate: string) {
  const { data, loading, error } = useSupabaseQuery<FieldValue[]>(
    `field_values:${fromDate}:${toDate}`,
    () =>
      supabase
        .from('field_values')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
  )

  return { values: data ?? [], loading, error }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useFieldValues.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFieldValues.ts src/hooks/useFieldValuesBulk.ts src/hooks/useFieldValues.test.ts
git commit -m "feat: add field value hooks with bulk upsert save"
```

---

### Task 5: Stepper and FieldSection components

**Files:**
- Create: `src/components/ui/Stepper.tsx`
- Create: `src/components/today/FieldSection.tsx`
- Test: `src/components/today/FieldSection.test.tsx`

**Interfaces:**
- Consumes: `Slider` (`src/components/ui/Slider.tsx`), `defaultFieldValue` from Task 2.
- Produces:
  - `Stepper({ label, value, onChange, unit? }: { label: string; value: number; onChange: (v: number) => void; unit?: string })`
  - `FieldSection({ field, value, onChange }: { field: CustomField; value: FieldValueData; onChange: (v: FieldValueData) => void })`

- [ ] **Step 1: Write the failing tests**

Create `src/components/today/FieldSection.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldSection } from './FieldSection'
import type { CustomField } from '../../lib/database.types'

const base: Omit<CustomField, 'type' | 'config'> = {
  id: 'f1', user_id: 'u1', name: 'Stress', sort_order: 0,
  active: true, show_in_charts: true, created_at: '',
}

describe('FieldSection', () => {
  it('renders a slider with the field range', () => {
    const field: CustomField = { ...base, type: 'slider', config: { min: 1, max: 5, lowLabel: 'calm', highLabel: 'panicked' } }
    render(<FieldSection field={field} value={3} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '1')
    expect(slider).toHaveAttribute('max', '5')
    expect(screen.getByText('calm')).toBeInTheDocument()
    expect(screen.getByText('panicked')).toBeInTheDocument()
  })

  it('renders a stepper for number fields and increments', async () => {
    const field: CustomField = { ...base, name: 'Coffee', type: 'number', config: { unit: 'cups' } }
    const onChange = vi.fn()
    render(<FieldSection field={field} value={2} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('renders a checkbox for toggle fields', async () => {
    const field: CustomField = { ...base, name: 'Meditated', type: 'toggle', config: {} }
    const onChange = vi.fn()
    render(<FieldSection field={field} value={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders a textarea for text fields', async () => {
    const field: CustomField = { ...base, name: 'Notes', type: 'text', config: {} }
    const onChange = vi.fn()
    render(<FieldSection field={field} value="" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('renders tag chips and toggles selection', async () => {
    const field: CustomField = { ...base, name: 'Triggers', type: 'tags', config: { options: ['work', 'family'] } }
    const onChange = vi.fn()
    render(<FieldSection field={field} value={['work']} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'work' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'family' }))
    expect(onChange).toHaveBeenCalledWith(['work', 'family'])
    await userEvent.click(screen.getByRole('button', { name: 'work' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('falls back to the type default when the stored value is incompatible', () => {
    const field: CustomField = { ...base, type: 'slider', config: { min: 1, max: 10 } }
    render(<FieldSection field={field} value="was a note" onChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveValue('5')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/today/FieldSection.test.tsx`
Expected: FAIL — module `./FieldSection` not found.

- [ ] **Step 3: Implement**

Create `src/components/ui/Stepper.tsx` (markup lifted from `FoodSection`):

```tsx
interface StepperProps {
  label: string
  value: number
  unit?: string
  onChange: (value: number) => void
}

export function Stepper({ label, value, unit, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-6">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-4 ml-auto">
        <button
          type="button"
          onClick={() => value > 0 && onChange(value - 1)}
          aria-label="−"
          className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40"
          disabled={value === 0}
        >
          −
        </button>
        <span className="text-xl font-semibold w-6 text-center dark:text-white">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label="+"
          className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300"
        >
          +
        </button>
        {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}
```

Create `src/components/today/FieldSection.tsx`:

```tsx
import type { CustomField, FieldValueData } from '../../lib/database.types'
import { defaultFieldValue, isCompatibleValue } from '../../lib/fields'
import { Slider } from '../ui/Slider'
import { Stepper } from '../ui/Stepper'

interface FieldSectionProps {
  field: CustomField
  value: FieldValueData
  onChange: (value: FieldValueData) => void
}

export function FieldSection({ field, value, onChange }: FieldSectionProps) {
  // A stale value from before a type change falls back to the type default.
  const safe = isCompatibleValue(field.type, value) ? value : defaultFieldValue(field)

  switch (field.type) {
    case 'slider': {
      const min = field.config.min ?? 1
      const max = field.config.max ?? 10
      return (
        <div className="flex flex-col gap-1">
          <Slider label={field.name} value={safe as number} min={min} max={max} onChange={onChange} />
          {(field.config.lowLabel || field.config.highLabel) && (
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{field.config.lowLabel}</span>
              <span>{field.config.highLabel}</span>
            </div>
          )}
        </div>
      )
    }
    case 'number':
      return (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{field.name}</h2>
          <Stepper label={field.name} value={safe as number} unit={field.config.unit} onChange={onChange} />
        </div>
      )
    case 'toggle':
      return (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{field.name}</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={safe as boolean}
              onChange={e => onChange(e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
          </label>
        </div>
      )
    case 'text':
      return (
        <div className="flex flex-col gap-3">
          <label htmlFor={`field-${field.id}`} className="text-base font-semibold text-gray-900 dark:text-white">
            {field.name}
          </label>
          <textarea
            id={`field-${field.id}`}
            rows={4}
            value={safe as string}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )
    case 'tags': {
      const selected = safe as string[]
      const toggleTag = (tag: string) =>
        onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
      return (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{field.name}</h2>
          <div className="flex flex-wrap gap-2">
            {(field.config.options ?? []).map(opt => {
              const isOn = selected.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggleTag(opt)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    isOn
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/today/FieldSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Stepper.tsx src/components/today/FieldSection.tsx src/components/today/FieldSection.test.tsx
git commit -m "feat: add FieldSection widget renderer and Stepper"
```

---

### Task 6: TodayPage renders from field definitions

**Files:**
- Modify: `src/components/today/TodayPage.tsx` (full rewrite below)
- Delete: `src/components/today/MoodSection.tsx`, `MoodSection.test.tsx`, `FoodSection.tsx`, `FoodSection.test.tsx`, `ExerciseSection.tsx`, `ExerciseSection.test.tsx`, `GratitudeSection.tsx`, `GratitudeSection.test.tsx`
- Test: `src/components/today/TodayPage.test.tsx` (rewrite)

**Interfaces:**
- Consumes: `useFields` (Task 3), `useFieldValues` (Task 4), `FieldSection` (Task 5), existing `useDailyLog`, `SleepSection`, `MedsSection`.
- Produces: `LogForm` gains an `onManageFields: () => void` prop used by Task 7's modal trigger. `useDailyLog.save` is now called with **sleep columns only** — legacy mood/food/exercise/gratitude columns are never written.
- Section order (per spec): heading → Sleep → custom field sections by `sort_order` → Meds → Save button.

- [ ] **Step 1: Rewrite TodayPage**

Replace `src/components/today/TodayPage.tsx` entirely:

```tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { format, subDays, parseISO, isValid } from 'date-fns'
import { useDailyLog } from '../../hooks/useDailyLog'
import { useFields } from '../../hooks/useFields'
import { useFieldValues } from '../../hooks/useFieldValues'
import type { CustomField, DailyLog, DailyLogUpdate, FieldValueData } from '../../lib/database.types'
import { defaultFieldValue } from '../../lib/fields'
import { FieldSection } from './FieldSection'
import { MedsSection } from './MedsSection'
import { SleepSection } from './SleepSection'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function isValidDateParam(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const parsed = parseISO(s)
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === s
}

interface FormState {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
  tonight_bedtime: string
  fieldValues: Record<string, FieldValueData>
}

const toSleepData = (f: FormState): DailyLogUpdate => ({
  bedtime: f.bedtime || null,
  wake_time: f.wake_time || null,
  sleep_hours: f.sleep_hours,
  sleep_quality: f.sleep_quality,
  tonight_bedtime: f.tonight_bedtime || null,
})

function initialForm(
  log: DailyLog | null,
  autoBedtime: string,
  fields: CustomField[],
  values: Record<string, FieldValueData>
): FormState {
  const fieldValues: Record<string, FieldValueData> = {}
  for (const f of fields) fieldValues[f.id] = values[f.id] ?? defaultFieldValue(f)
  return {
    bedtime: log?.bedtime?.slice(0, 5) || autoBedtime,
    wake_time: log?.wake_time?.slice(0, 5) ?? '',
    sleep_hours: log?.sleep_hours ?? null,
    sleep_quality: log?.sleep_quality ?? 3,
    tonight_bedtime: log?.tonight_bedtime?.slice(0, 5) ?? '',
    fieldValues,
  }
}

interface TodayPageProps {
  /** Task 7 wires this to the ManageFieldsModal; a no-op default keeps this task self-contained. */
  onManageFields?: () => void
}

export function TodayPage({ onManageFields }: TodayPageProps) {
  const { date: dateParam } = useParams<{ date?: string }>()
  const paramValid = dateParam == null || isValidDateParam(dateParam)
  const date = dateParam != null && paramValid ? dateParam : todayStr()
  const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')

  const { log, loading, error, save } = useDailyLog(date)
  const { log: yesterdayLog, loading: yesterdayLoading } = useDailyLog(yesterday)
  const { activeFields, loading: fieldsLoading, error: fieldsError } = useFields()
  const { values, loading: valuesLoading, error: valuesError, saveAll } = useFieldValues(date)

  if (!paramValid) {
    return <Navigate to="/" replace />
  }

  if (loading || yesterdayLoading || fieldsLoading || valuesLoading) {
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
  }

  const loadError = error ?? fieldsError ?? valuesError
  if (loadError) {
    return <div className="text-center text-red-500 mt-12">Could not load this entry: {loadError}</div>
  }

  const autoBedtime = yesterdayLog?.tonight_bedtime?.slice(0, 5) ?? ''

  return (
    <LogForm
      key={date}
      date={date}
      fields={activeFields}
      initial={initialForm(log, autoBedtime, activeFields, values)}
      save={save}
      saveValues={saveAll}
      onManageFields={onManageFields}
    />
  )
}

interface LogFormProps {
  date: string
  fields: CustomField[]
  initial: FormState
  save: (values: DailyLogUpdate) => Promise<{ error: string | null }>
  saveValues: (values: Record<string, FieldValueData>) => Promise<{ error: string | null }>
  onManageFields?: () => void
}

function LogForm({ date, fields, initial, save, saveValues, onManageFields }: LogFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(savedTimeout.current), [])

  const fieldValue = (f: CustomField) => form.fieldValues[f.id] ?? defaultFieldValue(f)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    const [logRes, valuesRes] = await Promise.all([
      save(toSleepData(form)),
      saveValues(form.fieldValues),
    ])
    const error = logRes.error ?? valuesRes.error
    if (error) {
      setSaveError(error)
    } else {
      setSaved(true)
      clearTimeout(savedTimeout.current)
      savedTimeout.current = setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const isToday = date === todayStr()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isToday ? 'Today' : date}
        </h1>
        {onManageFields && (
          <button
            type="button"
            onClick={onManageFields}
            className="text-sm text-blue-600 font-medium"
          >
            Manage fields
          </button>
        )}
      </div>

      <SleepSection
        values={{
          bedtime: form.bedtime,
          wake_time: form.wake_time,
          sleep_hours: form.sleep_hours,
          sleep_quality: form.sleep_quality,
          tonight_bedtime: form.tonight_bedtime,
        }}
        onChange={v => setForm(f => ({ ...f, ...v }))}
      />

      {fields.map(field => (
        <div key={field.id} className="flex flex-col gap-6">
          <hr className="border-gray-200 dark:border-gray-700" />
          <FieldSection
            field={field}
            value={fieldValue(field)}
            onChange={v =>
              setForm(f => ({ ...f, fieldValues: { ...f.fieldValues, [field.id]: v } }))
            }
          />
        </div>
      ))}

      <hr className="border-gray-200 dark:border-gray-700" />

      <MedsSection date={date} />

      {saveError && (
        <p className="text-red-600 text-sm">{saveError}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Delete the retired sections and their tests**

```bash
git rm src/components/today/MoodSection.tsx src/components/today/MoodSection.test.tsx \
       src/components/today/FoodSection.tsx src/components/today/FoodSection.test.tsx \
       src/components/today/ExerciseSection.tsx src/components/today/ExerciseSection.test.tsx \
       src/components/today/GratitudeSection.tsx src/components/today/GratitudeSection.test.tsx
```

- [ ] **Step 3: Rewrite the TodayPage test**

Replace `src/components/today/TodayPage.test.tsx` entirely (mock the three hooks; MedsSection/SleepSection render against their own hook mocks is out of scope here, so mock them too):

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TodayPage } from './TodayPage'
import type { CustomField } from '../../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})

const mockSave = vi.fn().mockResolvedValue({ error: null })
const mockSaveAll = vi.fn().mockResolvedValue({ error: null })

vi.mock('../../hooks/useDailyLog', () => ({
  useDailyLog: vi.fn(() => ({ log: null, loading: false, error: null, save: mockSave })),
}))
vi.mock('../../hooks/useFields', () => ({
  useFields: vi.fn(() => ({
    activeFields: [field({}), field({ id: 'f2', name: 'Meditated', type: 'toggle', config: {}, sort_order: 1 })],
    fields: [], loading: false, error: null,
  })),
}))
vi.mock('../../hooks/useFieldValues', () => ({
  useFieldValues: vi.fn(() => ({ values: { f1: 7 }, loading: false, error: null, saveAll: mockSaveAll })),
}))
vi.mock('./MedsSection', () => ({ MedsSection: () => <div>meds-section</div> }))
vi.mock('./SleepSection', () => ({ SleepSection: () => <div>sleep-section</div> }))

beforeEach(() => vi.clearAllMocks())

const renderPage = () => render(<MemoryRouter><TodayPage /></MemoryRouter>)

describe('TodayPage', () => {
  it('renders a section per active field in order', () => {
    renderPage()
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Meditated')).toBeInTheDocument()
    expect(screen.getByText('sleep-section')).toBeInTheDocument()
    expect(screen.getByText('meds-section')).toBeInTheDocument()
  })

  it('initializes field widgets from stored values', () => {
    renderPage()
    expect(screen.getByRole('slider')).toHaveValue('7')
  })

  it('save writes sleep columns to daily_logs and field values to saveAll', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockSaveAll).toHaveBeenCalled())
    expect(mockSaveAll).toHaveBeenCalledWith({ f1: 7, f2: false })
    const sleepPayload = mockSave.mock.calls[0][0]
    expect(sleepPayload).toEqual({
      bedtime: null, wake_time: null, sleep_hours: null, sleep_quality: 3, tonight_bedtime: null,
    })
    expect(sleepPayload).not.toHaveProperty('mood_rating')
    expect(sleepPayload).not.toHaveProperty('gratitude')
  })

  it('shows the save error when field values fail to save', async () => {
    mockSaveAll.mockResolvedValueOnce({ error: 'boom' })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the suite and fix fallout**

Run: `npx vitest run src/components/today/TodayPage.test.tsx` — expected: PASS.
Run: `npm test` — expected: PASS with no references to deleted components (fix any straggler imports).
Run: `npm run build` — expected: clean.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/today src/components/ui
git commit -m "feat: render Today page sections from custom field definitions"
```

---

### Task 7: ManageFieldsModal

**Files:**
- Create: `src/components/today/ManageFieldsModal.tsx`
- Modify: `src/components/today/TodayPage.tsx` (wire the modal)
- Test: `src/components/today/ManageFieldsModal.test.tsx`

**Interfaces:**
- Consumes: `useFields` API (Task 3), `validateField` + `isCompatibleTypeChange` (Task 2).
- Produces: `ManageFieldsModal({ fields, onAdd, onUpdate, onArchive, onReactivate, onDelete, onMove, onClose })` where the `on*` handlers match `useFields` signatures exactly (`onMove(id, direction: -1 | 1)`).

- [ ] **Step 1: Write the failing tests**

Create `src/components/today/ManageFieldsModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManageFieldsModal } from './ManageFieldsModal'
import type { CustomField } from '../../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})
const mood = field({})
const archived = field({ id: 'f3', name: 'Old habit', type: 'toggle', config: {}, sort_order: 2, active: false })

const handlers = {
  onAdd: vi.fn().mockResolvedValue(null),
  onUpdate: vi.fn().mockResolvedValue(null),
  onArchive: vi.fn().mockResolvedValue(null),
  onReactivate: vi.fn().mockResolvedValue(null),
  onDelete: vi.fn().mockResolvedValue(null),
  onMove: vi.fn().mockResolvedValue(null),
  onClose: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

const renderModal = (fields = [mood, archived]) =>
  render(<ManageFieldsModal fields={fields} {...handlers} />)

describe('ManageFieldsModal', () => {
  it('lists active and archived fields separately', () => {
    renderModal()
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Old habit')).toBeInTheDocument()
  })

  it('adds a field after validation passes', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Name (required)'), 'Stress')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(handlers.onAdd).toHaveBeenCalledWith({
      name: 'Stress', type: 'slider', config: { min: 1, max: 10, lowLabel: '', highLabel: '' },
    })
  })

  it('rejects a duplicate name without calling onAdd', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Name (required)'), 'mood')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(handlers.onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('A field with this name already exists')).toBeInTheDocument()
  })

  it('warns before an incompatible type change', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(handlers.onUpdate).not.toHaveBeenCalled()
  })

  it('archives with confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(handlers.onArchive).toHaveBeenCalledWith('f1')
  })

  it('hard delete requires typing DELETE', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('nope')
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
    vi.spyOn(window, 'prompt').mockReturnValue('DELETE')
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).toHaveBeenCalledWith('f3')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/today/ManageFieldsModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the modal**

Create `src/components/today/ManageFieldsModal.tsx`:

```tsx
import { useEffect, useState } from 'react'
import type { CustomField, FieldConfig, FieldType } from '../../lib/database.types'
import { isCompatibleTypeChange, validateField, type FieldData } from '../../lib/fields'

interface Props {
  fields: CustomField[]
  onAdd: (data: FieldData) => Promise<string | null>
  onUpdate: (id: string, data: FieldData & { show_in_charts?: boolean }) => Promise<string | null>
  onArchive: (id: string) => Promise<string | null>
  onReactivate: (id: string) => Promise<string | null>
  onDelete: (id: string) => Promise<string | null>
  onMove: (id: string, direction: -1 | 1) => Promise<string | null>
  onClose: () => void
}

interface FormValues {
  name: string
  type: FieldType
  min: string
  max: string
  lowLabel: string
  highLabel: string
  unit: string
  options: string
  show_in_charts: boolean
}

const EMPTY: FormValues = {
  name: '', type: 'slider', min: '1', max: '10',
  lowLabel: '', highLabel: '', unit: '', options: '', show_in_charts: true,
}

function toConfig(v: FormValues): FieldConfig {
  switch (v.type) {
    case 'slider':
      return {
        min: Number(v.min), max: Number(v.max),
        lowLabel: v.lowLabel, highLabel: v.highLabel,
      }
    case 'number':
      return v.unit ? { unit: v.unit } : {}
    case 'tags':
      return { options: v.options.split(',').map(s => s.trim()).filter(Boolean) }
    default:
      return {}
  }
}

function toFormValues(f: CustomField): FormValues {
  return {
    name: f.name,
    type: f.type,
    min: String(f.config.min ?? 1),
    max: String(f.config.max ?? 10),
    lowLabel: f.config.lowLabel ?? '',
    highLabel: f.config.highLabel ?? '',
    unit: f.config.unit ?? '',
    options: (f.config.options ?? []).join(', '),
    show_in_charts: f.show_in_charts,
  }
}

const TYPE_LABELS: Record<FieldType, string> = {
  slider: 'Slider (rate 1–10)',
  number: 'Number',
  toggle: 'Yes / No',
  text: 'Text',
  tags: 'Tags',
}

const inputClass =
  'border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white'

function ConfigInputs({ values, setValues }: {
  values: FormValues
  setValues: (updater: (v: FormValues) => FormValues) => void
}) {
  return (
    <>
      {values.type === 'slider' && (
        <div className="flex gap-2">
          <input
            type="number" aria-label="Min" className={`${inputClass} w-16`} value={values.min}
            onChange={e => setValues(v => ({ ...v, min: e.target.value }))}
          />
          <input
            type="number" aria-label="Max" className={`${inputClass} w-16`} value={values.max}
            onChange={e => setValues(v => ({ ...v, max: e.target.value }))}
          />
          <input
            className={`${inputClass} flex-1 min-w-0`} placeholder="Low label" value={values.lowLabel}
            onChange={e => setValues(v => ({ ...v, lowLabel: e.target.value }))}
          />
          <input
            className={`${inputClass} flex-1 min-w-0`} placeholder="High label" value={values.highLabel}
            onChange={e => setValues(v => ({ ...v, highLabel: e.target.value }))}
          />
        </div>
      )}
      {values.type === 'number' && (
        <input
          className={inputClass} placeholder="Unit (optional, e.g. cups)" value={values.unit}
          onChange={e => setValues(v => ({ ...v, unit: e.target.value }))}
        />
      )}
      {values.type === 'tags' && (
        <input
          className={inputClass} placeholder="Options, comma-separated" value={values.options}
          onChange={e => setValues(v => ({ ...v, options: e.target.value }))}
        />
      )}
    </>
  )
}

export function ManageFieldsModal({
  fields, onAdd, onUpdate, onArchive, onReactivate, onDelete, onMove, onClose,
}: Props) {
  const [addForm, setAddForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY)
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const active = fields.filter(f => f.active)
  const archived = fields.filter(f => !f.active)
  const namesExcept = (id: string | null) =>
    fields.filter(f => f.id !== id).map(f => f.name)

  const handleAdd = async () => {
    const data: FieldData = { name: addForm.name.trim(), type: addForm.type, config: toConfig(addForm) }
    const invalid = validateField(data, namesExcept(null))
    if (invalid) { setAddError(invalid); return }
    setAddError(null)
    const error = await onAdd(data)
    if (error) { setAddError(error); return }
    setAddForm(EMPTY)
  }

  const startEdit = (f: CustomField) => {
    setEditId(f.id)
    setEditForm(toFormValues(f))
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    const original = fields.find(f => f.id === editId)
    if (!original) return
    const data: FieldData = { name: editForm.name.trim(), type: editForm.type, config: toConfig(editForm) }
    const invalid = validateField(data, namesExcept(editId))
    if (invalid) { setEditError(invalid); return }
    if (
      original.type !== data.type &&
      !isCompatibleTypeChange(original.type, data.type) &&
      !window.confirm(
        'Past values that don’t match the new type will be hidden from charts (they stay in History). Continue?'
      )
    ) return
    setEditError(null)
    const error = await onUpdate(editId, { ...data, show_in_charts: editForm.show_in_charts })
    if (error) { setEditError(error); return }
    setEditId(null)
  }

  const handleArchive = async (f: CustomField) => {
    if (!window.confirm(`Archive ${f.name}? Its history is kept and it can be restored.`)) return
    setListError(null)
    const error = await onArchive(f.id)
    if (error) setListError(error)
  }

  const handleDelete = async (f: CustomField) => {
    const typed = window.prompt(
      `Permanently delete "${f.name}" and ALL of its logged values? Type DELETE to confirm.`
    )
    if (typed !== 'DELETE') return
    setListError(null)
    const error = await onDelete(f.id)
    if (error) setListError(error)
  }

  const handleMove = async (f: CustomField, direction: -1 | 1) => {
    setListError(null)
    const error = await onMove(f.id, direction)
    if (error) setListError(error)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-gray-900 w-full max-h-[80vh] rounded-t-2xl p-6 flex flex-col gap-4 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Fields</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 dark:text-gray-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {active.map((f, i) =>
            editId === f.id ? (
              <div key={f.id} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <input
                  className={inputClass}
                  value={editForm.name}
                  onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))}
                  placeholder="Name"
                />
                <label className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                  Type
                  <select
                    className={inputClass}
                    value={editForm.type}
                    onChange={e => setEditForm(v => ({ ...v, type: e.target.value as FieldType }))}
                  >
                    {(Object.keys(TYPE_LABELS) as FieldType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </label>
                <ConfigInputs values={editForm} setValues={setEditForm} />
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editForm.show_in_charts}
                    onChange={e => setEditForm(v => ({ ...v, show_in_charts: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600"
                  />
                  Show in charts
                </label>
                {editError && <p className="text-red-500 text-xs">{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white rounded p-2 text-sm">
                    Save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{f.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{TYPE_LABELS[f.type]}</p>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => handleMove(f, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${f.name} up`}
                    className="text-gray-500 dark:text-gray-400 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMove(f, 1)}
                    disabled={i === active.length - 1}
                    aria-label={`Move ${f.name} down`}
                    className="text-gray-500 dark:text-gray-400 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button onClick={() => startEdit(f)} className="text-blue-600 text-sm">Edit</button>
                  <button onClick={() => handleArchive(f)} className="text-red-500 text-sm">Archive</button>
                </div>
              </div>
            )
          )}
          {listError && <p className="text-red-500 text-xs">{listError}</p>}
        </div>

        {archived.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Archived</p>
            {archived.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-70">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{f.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{TYPE_LABELS[f.type]}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onReactivate(f.id)} className="text-blue-600 text-sm">Restore</button>
                  <button onClick={() => handleDelete(f)} className="text-red-500 text-sm">Delete forever</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add field</p>
          <input
            className={inputClass}
            value={addForm.name}
            onChange={e => setAddForm(v => ({ ...v, name: e.target.value }))}
            placeholder="Name (required)"
          />
          <label className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
            Type
            <select
              className={inputClass}
              value={addForm.type}
              onChange={e => setAddForm(v => ({ ...v, type: e.target.value as FieldType }))}
            >
              {(Object.keys(TYPE_LABELS) as FieldType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <ConfigInputs values={addForm} setValues={setAddForm} />
          {addError && <p className="text-red-500 text-xs">{addError}</p>}
          <button
            onClick={handleAdd}
            disabled={!addForm.name.trim()}
            className="bg-blue-600 text-white rounded p-2 text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire it into TodayPage**

In `src/components/today/TodayPage.tsx`, replace the `TodayPage` component body so it owns the modal (imports: add `useState` already imported, plus `ManageFieldsModal`):

```tsx
import { ManageFieldsModal } from './ManageFieldsModal'
```

Inside `TodayPage`, replace the `useFields` destructure and the return:

```tsx
export function TodayPage() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const paramValid = dateParam == null || isValidDateParam(dateParam)
  const date = dateParam != null && paramValid ? dateParam : todayStr()
  const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')

  const { log, loading, error, save } = useDailyLog(date)
  const { log: yesterdayLog, loading: yesterdayLoading } = useDailyLog(yesterday)
  const {
    fields, activeFields, loading: fieldsLoading, error: fieldsError,
    addField, updateField, archiveField, reactivateField, deleteField, moveField,
  } = useFields()
  const { values, loading: valuesLoading, error: valuesError, saveAll } = useFieldValues(date)
  const [showManage, setShowManage] = useState(false)

  if (!paramValid) {
    return <Navigate to="/" replace />
  }

  if (loading || yesterdayLoading || fieldsLoading || valuesLoading) {
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
  }

  const loadError = error ?? fieldsError ?? valuesError
  if (loadError) {
    return <div className="text-center text-red-500 mt-12">Could not load this entry: {loadError}</div>
  }

  const autoBedtime = yesterdayLog?.tonight_bedtime?.slice(0, 5) ?? ''

  return (
    <>
      <LogForm
        key={date}
        date={date}
        fields={activeFields}
        initial={initialForm(log, autoBedtime, activeFields, values)}
        save={save}
        saveValues={saveAll}
        onManageFields={() => setShowManage(true)}
      />
      {showManage && (
        <ManageFieldsModal
          fields={fields}
          onAdd={addField}
          onUpdate={updateField}
          onArchive={archiveField}
          onReactivate={reactivateField}
          onDelete={deleteField}
          onMove={moveField}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  )
}
```

Remove the now-unused `TodayPageProps` interface and the `onManageFields?: () => void` prop from `TodayPage` (LogForm keeps its `onManageFields` prop, now always provided).

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/today/ManageFieldsModal.test.tsx src/components/today/TodayPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/today/ManageFieldsModal.tsx src/components/today/ManageFieldsModal.test.tsx src/components/today/TodayPage.tsx
git commit -m "feat: add manage fields modal with add/edit/reorder/archive/delete"
```

---

### Task 8: FieldChart component

**Files:**
- Create: `src/components/charts/FieldChart.tsx`
- Test: `src/components/charts/FieldChart.test.tsx`

**Interfaces:**
- Consumes: `numericValue` (Task 2), `FieldValue` rows (Task 4's bulk hook shape).
- Produces: `FieldChart({ field, values, isDark }: { field: CustomField; values: FieldValue[]; isDark?: boolean })` — `values` must be for this field only, sorted ascending by date. Renders null for `text` fields or when `values` is empty.

- [ ] **Step 1: Write the failing tests**

Create `src/components/charts/FieldChart.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FieldChart } from './FieldChart'
import type { CustomField, FieldValue } from '../../lib/database.types'

vi.mock('recharts', async importOriginal => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 400, height: 200 }}>{children}</div>
  ),
}))

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Stress', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})
const value = (over: Partial<FieldValue>): FieldValue => ({
  id: 'v1', user_id: 'u1', field_id: 'f1', date: '2026-07-01', value: 5, created_at: '', ...over,
})

describe('FieldChart', () => {
  it('renders a titled card for a slider field', () => {
    render(<FieldChart field={field({})} values={[value({})]} />)
    expect(screen.getByText('Stress')).toBeInTheDocument()
  })

  it('shows a days count header for toggle fields', () => {
    const f = field({ type: 'toggle', config: {}, name: 'Meditated' })
    const vals = [
      value({ id: 'v1', date: '2026-07-01', value: true }),
      value({ id: 'v2', date: '2026-07-02', value: false }),
    ]
    render(<FieldChart field={f} values={vals} />)
    expect(screen.getByText('1/2 days')).toBeInTheDocument()
  })

  it('renders tag frequencies for tags fields', () => {
    const f = field({ type: 'tags', config: { options: ['work', 'family'] }, name: 'Triggers' })
    const vals = [
      value({ id: 'v1', date: '2026-07-01', value: ['work'] }),
      value({ id: 'v2', date: '2026-07-02', value: ['work', 'family'] }),
    ]
    render(<FieldChart field={f} values={vals} />)
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders nothing for text fields and empty data', () => {
    const { container: a } = render(
      <FieldChart field={field({ type: 'text', config: {} })} values={[value({ value: 'x' })]} />
    )
    expect(a).toBeEmptyDOMElement()
    const { container: b } = render(<FieldChart field={field({})} values={[]} />)
    expect(b).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/charts/FieldChart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/charts/FieldChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { CustomField, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'

interface FieldChartProps {
  field: CustomField
  values: FieldValue[]
  isDark?: boolean
}

function Card({ title, right, children }: {
  title: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  )
}

export function FieldChart({ field, values, isDark }: FieldChartProps) {
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

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
      <Card title={field.name}>
        <div className="flex flex-col gap-2">
          {sorted.map(([tag, count]) => (
            <div key={tag} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate text-gray-700 dark:text-gray-300">{tag}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-4">
                <div
                  className="bg-blue-600 h-4 rounded"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-gray-500 dark:text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  const data = values.map(v => ({
    date: v.date.slice(5),
    value: numericValue(field, v.value),
  }))

  if (field.type === 'toggle') {
    const yesDays = data.filter(d => d.value === 1).length
    const inactiveBarColor = isDark ? '#4b5563' : '#e5e7eb'
    return (
      <Card
        title={field.name}
        right={
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {yesDays}/{data.length} days
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} barSize={8}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip formatter={v => [v === 1 ? 'Yes' : 'No', field.name]} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.value ? '#16a34a' : inactiveBarColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    )
  }

  // slider / number → line chart
  const domain: [number | string, number | string] =
    field.type === 'slider'
      ? [field.config.min ?? 1, field.config.max ?? 10]
      : [0, 'auto']

  return (
    <Card title={field.name}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={domain} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" name={field.name} stroke="#2563eb" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/charts/FieldChart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/FieldChart.tsx src/components/charts/FieldChart.test.tsx
git commit -m "feat: add FieldChart with per-type chart rendering"
```

---

### Task 9: ChartsPage integration and streak generalization

**Files:**
- Modify: `src/hooks/useStreaks.ts`
- Modify: `src/components/charts/StatsSection.tsx`
- Modify: `src/components/charts/ChartsPage.tsx`
- Delete: `src/components/charts/MoodChart.tsx`, `MealsChart.tsx`, `ExerciseChart.tsx`
- Test: `src/hooks/useStreaks.test.ts` (update)

**Interfaces:**
- Consumes: `useFields`, `useFieldValuesBulk`, `FieldChart`.
- Produces:
  - `useStreaks(logs: DailyLog[], fields: CustomField[], fieldValues: FieldValue[], medicationLogs: MedicationLog[], medications: Medication[]): { logging: StreakResult; meds: StreakResult; toggles: Array<{ name: string; streak: StreakResult }> }`
  - Logging streak counts a day if it has a `daily_logs` row **or** any field value. Each active toggle field gets its own streak (days where value === true). `computeStreak` internals unchanged.
  - `StatsSection` props become exactly the `useStreaks` return shape.
  - ChartsPage builds `valuesByField: Map<string, FieldValue[]>` (rows ascending by date) and passes each active `show_in_charts` field to `FieldChart`. Tasks 10–11 consume `valuesByField`, `activeFields`, and `chronologicalLogs` from this component.

- [ ] **Step 1: Update the useStreaks test**

In `src/hooks/useStreaks.test.ts`, update calls to the new signature. Keep existing `computeStreak`-behavior cases (they exercise `logging` via log dates) by passing `[], []` for fields/values, e.g. `useStreaks(logs, [], [], medLogs, meds)`. Add these cases:

```ts
// (inside the existing describe block; reuse the file's existing helpers for dates)
import type { CustomField, FieldValue } from '../lib/database.types'

const toggleField: CustomField = {
  id: 'f1', user_id: 'u1', name: 'Meditated', type: 'toggle', config: {},
  sort_order: 0, active: true, show_in_charts: true, created_at: '',
}
const fv = (date: string, value: boolean): FieldValue => ({
  id: `v${date}`, user_id: 'u1', field_id: 'f1', date, value, created_at: '',
})

it('counts logging streak from field values even without daily_logs rows', () => {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const { result } = renderHook(() =>
    useStreaks([], [toggleField], [fv(yesterday, false)], [], [])
  )
  expect(result.current.logging.current).toBe(1)
})

it('builds a streak per active toggle field from true values', () => {
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd')
  const { result } = renderHook(() =>
    useStreaks([], [toggleField], [fv(yesterday, true), fv(twoDaysAgo, true)], [], [])
  )
  expect(result.current.toggles).toEqual([
    { name: 'Meditated', streak: { current: 2, longest: 2 } },
  ])
})
```

Run: `npx vitest run src/hooks/useStreaks.test.ts` — expected: FAIL (signature mismatch).

- [ ] **Step 2: Update useStreaks**

In `src/hooks/useStreaks.ts`, keep `computeStreak` exactly as is; replace the exported hook:

```ts
import { useMemo } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import type { CustomField, DailyLog, FieldValue, Medication, MedicationLog } from '../lib/database.types'

// ... computeStreak unchanged ...

export function useStreaks(
  logs: DailyLog[],
  fields: CustomField[],
  fieldValues: FieldValue[],
  medicationLogs: MedicationLog[],
  medications: Medication[]
): { logging: StreakResult; meds: StreakResult; toggles: Array<{ name: string; streak: StreakResult }> } {
  return useMemo(() => {
    const loggingDates = new Set([
      ...logs.map(l => l.date),
      ...fieldValues.map(v => v.date),
    ])

    const toggles = fields
      .filter(f => f.active && f.type === 'toggle')
      .map(f => ({
        name: f.name,
        streak: computeStreak(
          new Set(fieldValues.filter(v => v.field_id === f.id && v.value === true).map(v => v.date))
        ),
      }))

    const medIds = medications.map(m => m.id)
    const medsDates = new Set<string>()
    if (medIds.length > 0) {
      const byDate = new Map<string, Map<string, boolean>>()
      for (const ml of medicationLogs) {
        if (!byDate.has(ml.date)) byDate.set(ml.date, new Map())
        byDate.get(ml.date)!.set(ml.medication_id, ml.taken)
      }
      for (const [date, dayMap] of byDate) {
        if (medIds.every(id => dayMap.get(id) === true)) medsDates.add(date)
      }
    }

    return {
      logging: computeStreak(loggingDates),
      toggles,
      meds: medIds.length === 0 ? { current: 0, longest: 0 } : computeStreak(medsDates),
    }
  }, [logs, fields, fieldValues, medicationLogs, medications])
}
```

Run: `npx vitest run src/hooks/useStreaks.test.ts` — expected: PASS.

- [ ] **Step 3: Update StatsSection**

`src/components/charts/StatsSection.tsx` currently takes `{ logging, exercise, meds }` and renders three hardcoded `StreakCard`s. Keep `StreakCard` exactly as it is; replace the `Props` interface and `StatsSection` with:

```tsx
interface StreakResult {
  current: number
  longest: number
}

interface Props {
  logging: StreakResult
  meds: StreakResult
  toggles: Array<{ name: string; streak: StreakResult }>
}

export function StatsSection({ logging, meds, toggles }: Props) {
  const items = [
    { label: 'Logging', ...logging },
    ...toggles.map(t => ({ label: t.name, ...t.streak })),
    { label: 'Medications', ...meds },
  ]
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Streaks</h2>
      <div className="flex gap-3 flex-wrap">
        {items.map(item => (
          <StreakCard key={item.label} label={item.label} current={item.current} longest={item.longest} />
        ))}
      </div>
    </div>
  )
}
```

(`flex-wrap` added so many toggle fields wrap instead of squeezing.) If `StatsSection` has a test file, update its props accordingly.

- [ ] **Step 4: Rewrite ChartsPage**

Replace `src/components/charts/ChartsPage.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { useFields } from '../../hooks/useFields'
import { useFieldValuesBulk } from '../../hooks/useFieldValuesBulk'
import { useMedications } from '../../hooks/useMedications'
import { useMedicationLogsBulk } from '../../hooks/useMedicationLogsBulk'
import { useTheme } from '../../hooks/useTheme'
import { useStreaks } from '../../hooks/useStreaks'
import type { FieldValue } from '../../lib/database.types'
import { SleepChart } from './SleepChart'
import { FieldChart } from './FieldChart'
import { OverlaySection } from './OverlaySection'
import { StatsSection } from './StatsSection'
import { CorrelationsSection } from './CorrelationsSection'

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function ChartsPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const { fromDate, toDate, from365 } = useMemo(() => {
    const now = new Date()
    return {
      toDate: format(now, 'yyyy-MM-dd'),
      fromDate: format(subDays(now, rangeDays), 'yyyy-MM-dd'),
      from365: format(subDays(now, 365), 'yyyy-MM-dd'),
    }
  }, [rangeDays])

  // One fetch covers both the charts (sliced to the selected range) and streaks.
  const { logs: logs365, loading: logsLoading } = useLogs(from365, toDate)
  const { fields, activeFields, loading: fieldsLoading } = useFields()
  const { values: values365, loading: valuesLoading } = useFieldValuesBulk(from365, toDate)
  const { medications } = useMedications()
  const { logs: medLogs365 } = useMedicationLogsBulk(from365, toDate)

  const loading = logsLoading || fieldsLoading || valuesLoading
  const logs = useMemo(() => logs365.filter(l => l.date >= fromDate), [logs365, fromDate])
  const chronologicalLogs = useMemo(() => [...logs].reverse(), [logs])
  const rangeValues = useMemo(() => values365.filter(v => v.date >= fromDate), [values365, fromDate])
  const valuesByField = useMemo(() => {
    const map = new Map<string, FieldValue[]>()
    for (const v of [...rangeValues].sort((a, b) => a.date.localeCompare(b.date))) {
      const list = map.get(v.field_id)
      if (list) list.push(v)
      else map.set(v.field_id, [v])
    }
    return map
  }, [rangeValues])
  const { isDark } = useTheme()
  const streaks = useStreaks(logs365, fields, values365, medLogs365, medications)

  const hasData = chronologicalLogs.length > 0 || rangeValues.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Charts</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-400 dark:text-gray-500 mt-8">Loading…</div>}

      {!loading && !hasData && (
        <div className="text-center text-gray-400 dark:text-gray-500 mt-8">
          No entries for this period.
        </div>
      )}

      {!loading && hasData && (
        <>
          {chronologicalLogs.length > 0 && <SleepChart logs={chronologicalLogs} isDark={isDark} />}
          {activeFields
            .filter(f => f.show_in_charts)
            .map(f => (
              <FieldChart key={f.id} field={f} values={valuesByField.get(f.id) ?? []} isDark={isDark} />
            ))}
          <OverlaySection
            fields={activeFields}
            valuesByField={valuesByField}
            logs={chronologicalLogs}
            isDark={isDark}
          />
        </>
      )}

      <StatsSection {...streaks} />

      {!loading && hasData && (
        <CorrelationsSection
          fields={activeFields}
          valuesByField={valuesByField}
          logs={chronologicalLogs}
          isDark={isDark}
        />
      )}
    </div>
  )
}
```

Note: `OverlaySection` (Task 10) and the new `CorrelationsSection` props (Task 11) don't exist yet. To keep this task shippable, add the two lines commented out with `{/* … */}` and enable them in Tasks 10/11 — or execute Tasks 9–11 as one PR-sized unit committing at each green suite. Prefer the comment-out approach:

```tsx
{/* OverlaySection enabled in Task 10 */}
{/* CorrelationsSection re-enabled with new props in Task 11 */}
```

(with their imports also commented) and delete the old `CorrelationsSection` usage for now.

- [ ] **Step 5: Delete retired charts**

```bash
git rm src/components/charts/MoodChart.tsx src/components/charts/MealsChart.tsx src/components/charts/ExerciseChart.tsx
```

- [ ] **Step 6: Full check**

Run: `npm test` — expected: PASS.
Run: `npm run build` — expected: clean (chase any lingering imports of deleted charts).

- [ ] **Step 7: Commit**

```bash
git add -A src/components/charts src/hooks/useStreaks.ts src/hooks/useStreaks.test.ts
git commit -m "feat: drive charts page and streaks from custom fields"
```

---

### Task 10: Overlay picker

**Files:**
- Create: `src/lib/overlay.ts`
- Create: `src/components/charts/OverlaySection.tsx`
- Modify: `src/components/charts/ChartsPage.tsx` (uncomment OverlaySection)
- Test: `src/lib/overlay.test.ts`

**Interfaces:**
- Consumes: `numericValue` (Task 2), `valuesByField` map shape from Task 9.
- Produces (from `src/lib/overlay.ts`):
  - `interface OverlaySeries { key: string; label: string; points: Array<{ date: string; raw: number }>; min: number; max: number }`
  - `percentOfRange(raw: number, min: number, max: number): number` — 0–100 clamped, 1 decimal, `50` when `max === min`.
  - `buildOverlayData(series: OverlaySeries[]): Array<Record<string, string | number>>` — one row per date (ascending, union of all series dates), keys `date`, `<label>` (percent), `<label> raw`.
- Produces: `OverlaySection({ fields, valuesByField, logs, isDark })` — chips to pick 2–3 series among numeric fields (with ≥ 1 point) + "Sleep hours" (range 0–12) + "Sleep quality" (range 1–5); renders a normalized LineChart once ≥ 2 selected; tooltip shows raw values.

- [ ] **Step 1: Write the failing lib tests**

Create `src/lib/overlay.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { percentOfRange, buildOverlayData, type OverlaySeries } from './overlay'

describe('percentOfRange', () => {
  it('maps min→0, max→100, midpoint→50 (1 decimal)', () => {
    expect(percentOfRange(1, 1, 10)).toBe(0)
    expect(percentOfRange(10, 1, 10)).toBe(100)
    expect(percentOfRange(4, 1, 10)).toBe(33.3)
  })
  it('clamps out-of-range values and handles a degenerate range', () => {
    expect(percentOfRange(14, 0, 12)).toBe(100)
    expect(percentOfRange(-1, 0, 12)).toBe(0)
    expect(percentOfRange(3, 3, 3)).toBe(50)
  })
})

describe('buildOverlayData', () => {
  it('merges series by date with percent and raw keys', () => {
    const stress: OverlaySeries = {
      key: 'field:f1', label: 'Stress', min: 1, max: 10,
      points: [{ date: '2026-07-01', raw: 1 }, { date: '2026-07-02', raw: 10 }],
    }
    const coffee: OverlaySeries = {
      key: 'field:f2', label: 'Coffee', min: 0, max: 4,
      points: [{ date: '2026-07-02', raw: 2 }],
    }
    expect(buildOverlayData([stress, coffee])).toEqual([
      { date: '07-01', Stress: 0, 'Stress raw': 1 },
      { date: '07-02', Stress: 100, 'Stress raw': 10, Coffee: 50, 'Coffee raw': 2 },
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/overlay.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the lib**

Create `src/lib/overlay.ts`:

```ts
export interface OverlaySeries {
  key: string
  label: string
  points: Array<{ date: string; raw: number }>
  min: number
  max: number
}

/** Percent of [min, max], clamped to 0–100, rounded to 1 decimal. */
export function percentOfRange(raw: number, min: number, max: number): number {
  if (max === min) return 50
  const pct = ((raw - min) / (max - min)) * 100
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10
}

/** Merge series into recharts rows keyed by date (MM-DD), ascending. */
export function buildOverlayData(
  series: OverlaySeries[]
): Array<Record<string, string | number>> {
  const byDate = new Map<string, Record<string, string | number>>()
  for (const s of series) {
    for (const p of s.points) {
      const row = byDate.get(p.date) ?? { date: p.date.slice(5) }
      row[s.label] = percentOfRange(p.raw, s.min, s.max)
      row[`${s.label} raw`] = p.raw
      byDate.set(p.date, row)
    }
  }
  return Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, row]) => row)
}
```

- [ ] **Step 4: Run lib tests**

Run: `npx vitest run src/lib/overlay.test.ts` — expected: PASS.

- [ ] **Step 5: Implement OverlaySection**

Create `src/components/charts/OverlaySection.tsx`:

```tsx
import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { CustomField, DailyLog, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'
import { buildOverlayData, type OverlaySeries } from '../../lib/overlay'

interface Props {
  fields: CustomField[]
  valuesByField: Map<string, FieldValue[]>
  logs: DailyLog[]
  isDark: boolean
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b']
const MAX_SERIES = 3

export function OverlaySection({ fields, valuesByField, logs, isDark }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  const available = useMemo<OverlaySeries[]>(() => {
    const series: OverlaySeries[] = []
    for (const f of fields) {
      if (f.type !== 'slider' && f.type !== 'number') continue
      const points = (valuesByField.get(f.id) ?? [])
        .map(v => ({ date: v.date, raw: numericValue(f, v.value) }))
        .filter((p): p is { date: string; raw: number } => p.raw !== null)
      if (points.length === 0) continue
      const min = f.type === 'slider' ? (f.config.min ?? 1) : 0
      const max = f.type === 'slider'
        ? (f.config.max ?? 10)
        : Math.max(1, ...points.map(p => p.raw))
      series.push({ key: `field:${f.id}`, label: f.name, points, min, max })
    }
    const sleepHours = logs
      .filter(l => l.sleep_hours != null)
      .map(l => ({ date: l.date, raw: l.sleep_hours! }))
    if (sleepHours.length > 0) {
      series.push({ key: 'sleep_hours', label: 'Sleep hours', points: sleepHours, min: 0, max: 12 })
    }
    const sleepQuality = logs
      .filter(l => l.sleep_quality != null)
      .map(l => ({ date: l.date, raw: l.sleep_quality! }))
    if (sleepQuality.length > 0) {
      series.push({ key: 'sleep_quality', label: 'Sleep quality', points: sleepQuality, min: 1, max: 5 })
    }
    return series
  }, [fields, valuesByField, logs])

  if (available.length < 2) return null

  const toggle = (key: string) =>
    setSelected(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : prev.length >= MAX_SERIES ? prev : [...prev, key]
    )

  const chosen = available.filter(s => selected.includes(s.key))
  const data = buildOverlayData(chosen)
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Compare</h2>
      <div className="flex flex-wrap gap-2">
        {available.map(s => {
          const isOn = selected.includes(s.key)
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                isOn
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      {chosen.length < 2 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Pick 2–{MAX_SERIES} series to compare (scaled to each one's own range).
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: tickColor }} unit="%" />
            <Tooltip
              formatter={(_value, name, item) => {
                const payload = (item as { payload: Record<string, number | string> }).payload
                return [payload[`${String(name)} raw`], name]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chosen.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.label}
                stroke={COLORS[i % COLORS.length]}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

Uncomment the `OverlaySection` import and JSX in `ChartsPage.tsx`.

- [ ] **Step 6: Full check and commit**

Run: `npm test` && `npm run build` — expected: PASS/clean.

```bash
git add src/lib/overlay.ts src/lib/overlay.test.ts src/components/charts/OverlaySection.tsx src/components/charts/ChartsPage.tsx
git commit -m "feat: add overlay picker to compare fields on one normalized chart"
```

---

### Task 11: Correlations over custom fields

**Files:**
- Rewrite: `src/lib/correlations.ts`
- Rewrite: `src/lib/correlations.test.ts`
- Rewrite: `src/components/charts/CorrelationsSection.tsx`
- Modify: `src/components/charts/ChartsPage.tsx` (re-enable with new props)

**Interfaces:**
- Consumes: `numericValue`, `valuesByField`, `chronologicalLogs`.
- Produces (from `src/lib/correlations.ts`):
  - `interface Point { x: number; y: number }`
  - `interface ComparisonResult { groupA: { label: string; avg: number; count: number }; groupB: { label: string; avg: number; count: number }; hasEnoughData: boolean }`
  - `compareGroups(points: Point[], splitFn: (p: Point) => boolean, labelA: string, labelB: string, minPoints?: number): ComparisonResult` (default `minPoints = 3`, averages `toFixed(1)`)
  - `median(nums: number[]): number`
- Correlation rule: the **primary metric** is the user's first active slider field (lowest `sort_order`); each other active numeric/toggle field plus sleep hours (split at ≥ 7) and sleep quality (split at ≥ 3) is compared against it. Toggles split yes/no (labels "Yes"/"No"); numeric series split at ≥ median (labels `≥ m` / `< m`). No primary slider → section renders nothing.

- [ ] **Step 1: Rewrite the lib test**

Replace `src/lib/correlations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { compareGroups, median, type Point } from './correlations'

const p = (x: number, y: number): Point => ({ x, y })

describe('median', () => {
  it('returns the middle value for odd counts and the mean of middles for even', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([5])).toBe(5)
  })
})

describe('compareGroups', () => {
  const points = [p(1, 8), p(1, 6), p(1, 7), p(0, 4), p(0, 5), p(0, 3)]

  it('averages each side of the split to 1 decimal', () => {
    const r = compareGroups(points, pt => pt.x === 1, 'Yes', 'No')
    expect(r.groupA).toEqual({ label: 'Yes', avg: 7, count: 3 })
    expect(r.groupB).toEqual({ label: 'No', avg: 4, count: 3 })
    expect(r.hasEnoughData).toBe(true)
  })

  it('needs minPoints on both sides', () => {
    const r = compareGroups(points.slice(0, 4), pt => pt.x === 1, 'Yes', 'No')
    expect(r.hasEnoughData).toBe(false)
  })
})
```

Run: `npx vitest run src/lib/correlations.test.ts` — expected: FAIL.

- [ ] **Step 2: Rewrite the lib**

Replace `src/lib/correlations.ts`:

```ts
export interface Point {
  x: number
  y: number
}

export interface ComparisonResult {
  groupA: { label: string; avg: number; count: number }
  groupB: { label: string; avg: number; count: number }
  hasEnoughData: boolean
}

export function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function compareGroups(
  points: Point[],
  splitFn: (p: Point) => boolean,
  labelA: string,
  labelB: string,
  minPoints = 3
): ComparisonResult {
  const groupA = points.filter(splitFn)
  const groupB = points.filter(p => !splitFn(p))

  const avg = (arr: Point[]) =>
    arr.length === 0
      ? 0
      : parseFloat((arr.reduce((sum, p) => sum + p.y, 0) / arr.length).toFixed(1))

  return {
    groupA: { label: labelA, avg: avg(groupA), count: groupA.length },
    groupB: { label: labelB, avg: avg(groupB), count: groupB.length },
    hasEnoughData: groupA.length >= minPoints && groupB.length >= minPoints,
  }
}
```

Run: `npx vitest run src/lib/correlations.test.ts` — expected: PASS.

- [ ] **Step 3: Rewrite CorrelationsSection**

Replace `src/components/charts/CorrelationsSection.tsx`:

```tsx
import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { CustomField, DailyLog, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'
import { compareGroups, median, type Point } from '../../lib/correlations'

interface Props {
  fields: CustomField[]
  valuesByField: Map<string, FieldValue[]>
  logs: DailyLog[]
  isDark: boolean
}

interface Candidate {
  title: string
  splitFn: (p: Point) => boolean
  labelA: string
  labelB: string
  points: Point[]
  xAxisLabel: string
}

export function CorrelationsSection({ fields, valuesByField, logs, isDark }: Props) {
  const tickColor = isDark ? '#9ca3af' : '#6b7280'
  const blue = '#2563eb'
  const gray = isDark ? '#4b5563' : '#d1d5db'

  const primary = fields.find(f => f.type === 'slider') ?? null

  const cards = useMemo(() => {
    if (!primary) return []
    const yByDate = new Map<string, number>()
    for (const v of valuesByField.get(primary.id) ?? []) {
      const n = numericValue(primary, v.value)
      if (n !== null) yByDate.set(v.date, n)
    }

    const candidates: Candidate[] = []

    const addNumericCandidate = (
      title: string, xAxisLabel: string, xs: Array<{ date: string; x: number }>,
      fixedSplit?: { at: number; labelA: string; labelB: string }
    ) => {
      const points = xs
        .filter(({ date }) => yByDate.has(date))
        .map(({ date, x }) => ({ x, y: yByDate.get(date)! }))
      if (points.length === 0) return
      const split = fixedSplit ?? (() => {
        const m = median(points.map(p => p.x))
        return { at: m, labelA: `≥ ${m}`, labelB: `< ${m}` }
      })()
      candidates.push({
        title, xAxisLabel, points,
        splitFn: p => p.x >= split.at,
        labelA: split.labelA, labelB: split.labelB,
      })
    }

    for (const f of fields) {
      if (f.id === primary.id || (f.type !== 'slider' && f.type !== 'number' && f.type !== 'toggle')) continue
      const xs = (valuesByField.get(f.id) ?? [])
        .map(v => ({ date: v.date, x: numericValue(f, v.value) }))
        .filter((e): e is { date: string; x: number } => e.x !== null)
      if (f.type === 'toggle') {
        addNumericCandidate(`${f.name} vs ${primary.name}`, `${f.name} (1=yes, 0=no)`, xs,
          { at: 1, labelA: 'Yes', labelB: 'No' })
      } else {
        addNumericCandidate(`${f.name} vs ${primary.name}`, f.name, xs)
      }
    }

    addNumericCandidate(
      `Sleep hours vs ${primary.name}`, 'Sleep hours',
      logs.filter(l => l.sleep_hours != null).map(l => ({ date: l.date, x: l.sleep_hours! })),
      { at: 7, labelA: '7+ hours', labelB: '<7 hours' }
    )
    addNumericCandidate(
      `Sleep quality vs ${primary.name}`, 'Sleep quality (1-5)',
      logs.filter(l => l.sleep_quality != null).map(l => ({ date: l.date, x: l.sleep_quality! })),
      { at: 3, labelA: 'Quality 3-5', labelB: 'Quality 1-2' }
    )

    return candidates
      .map(c => ({
        cfg: c,
        result: compareGroups(c.points, c.splitFn, c.labelA, c.labelB),
        pA: c.points.filter(c.splitFn),
        pB: c.points.filter(p => !c.splitFn(p)),
      }))
      .filter(c => c.result.hasEnoughData)
  }, [fields, valuesByField, logs, primary])

  if (!primary || cards.length === 0) return null

  const yDomain: [number, number] = [primary.config.min ?? 1, primary.config.max ?? 10]

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Correlations</h2>
      {cards.map(({ cfg, result, pA, pB }) => (
        <div key={cfg.title} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <p className="font-medium text-gray-900 dark:text-white">{cfg.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {result.groupA.label}: avg {result.groupA.avg} ({result.groupA.count} days) —{' '}
            {result.groupB.label}: avg {result.groupB.avg} ({result.groupB.count} days)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ScatterChart>
              <XAxis dataKey="x" name={cfg.xAxisLabel} tick={{ fontSize: 11, fill: tickColor }} stroke={tickColor} />
              <YAxis dataKey="y" name={primary.name} domain={yDomain} tick={{ fontSize: 11, fill: tickColor }} stroke={tickColor} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name={result.groupA.label} data={pA} fill={blue} />
              <Scatter name={result.groupB.label} data={pB} fill={gray} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
```

Re-enable `CorrelationsSection` in `ChartsPage.tsx` with the new props (shown in Task 9's ChartsPage code).

- [ ] **Step 4: Full check and commit**

Run: `npm test` && `npm run build` — expected: PASS/clean.

```bash
git add src/lib/correlations.ts src/lib/correlations.test.ts src/components/charts/CorrelationsSection.tsx src/components/charts/ChartsPage.tsx
git commit -m "feat: generalize correlations to all numeric and toggle fields"
```

---

### Task 12: History from field values

**Files:**
- Modify: `src/components/history/HistoryPage.tsx`
- Rewrite: `src/components/history/HistoryEntry.tsx`
- Test: `src/components/history/HistoryEntry.test.tsx` (create or rewrite if present)

**Interfaces:**
- Consumes: `useFields`, `useFieldValuesBulk`, `displayValue` (Task 2).
- Produces: `HistoryEntry({ date, sleepHours, items }: { date: string; sleepHours: number | null; items: Array<{ field: CustomField; value: FieldValueData }> })`.
- Day list = union of `daily_logs` dates and `field_values` dates in the 90-day window, descending. `items` ordered by field `sort_order`; archived fields' values still shown.

- [ ] **Step 1: Write the failing HistoryEntry test**

Create (or replace) `src/components/history/HistoryEntry.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HistoryEntry } from './HistoryEntry'
import type { CustomField } from '../../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})

const renderEntry = (items: Array<{ field: CustomField; value: number | boolean | string | string[] }>) =>
  render(
    <MemoryRouter>
      <HistoryEntry date="2026-07-06" sleepHours={7.5} items={items} />
    </MemoryRouter>
  )

describe('HistoryEntry', () => {
  it('shows the date, sleep, and formatted field values', () => {
    renderEntry([
      { field: field({}), value: 7 },
      { field: field({ id: 'f2', name: 'Meditated', type: 'toggle', config: {} }), value: true },
    ])
    expect(screen.getByText('2026-07-06')).toBeInTheDocument()
    expect(screen.getByText('Sleep 7.5h')).toBeInTheDocument()
    expect(screen.getByText('Mood 7/10')).toBeInTheDocument()
    expect(screen.getByText('Meditated: Yes')).toBeInTheDocument()
  })

  it('renders text values as a quote block', () => {
    renderEntry([{ field: field({ id: 'f3', name: 'Notes', type: 'text', config: {} }), value: 'a good day' }])
    expect(screen.getByText('"a good day"')).toBeInTheDocument()
  })
})
```

Run: `npx vitest run src/components/history/HistoryEntry.test.tsx` — expected: FAIL.

- [ ] **Step 2: Rewrite HistoryEntry**

Replace `src/components/history/HistoryEntry.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import type { CustomField, FieldValueData } from '../../lib/database.types'
import { displayValue } from '../../lib/fields'

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

export interface HistoryItem {
  field: CustomField
  value: FieldValueData
}

interface HistoryEntryProps {
  date: string
  sleepHours: number | null
  items: HistoryItem[]
}

export function HistoryEntry({ date, sleepHours, items }: HistoryEntryProps) {
  const navigate = useNavigate()
  const textItems = items.filter(i => i.field.type === 'text' && displayValue(i.field, i.value))
  const chipItems = items.filter(i => i.field.type !== 'text' && displayValue(i.field, i.value))

  return (
    <button
      type="button"
      onClick={() => navigate(`/log/${date}`)}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-1"
    >
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{date}</span>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {sleepHours !== null && <span>Sleep {sleepHours}h</span>}
        {chipItems.map(({ field, value }) => (
          <span key={field.id}>
            {field.type === 'slider'
              ? `${field.name} ${displayValue(field, value)}`
              : `${field.name}: ${displayValue(field, value)}`}
          </span>
        ))}
      </div>
      {textItems.map(({ field, value }) => (
        <blockquote key={field.id} className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
          "{truncate(displayValue(field, value), 80)}"
        </blockquote>
      ))}
    </button>
  )
}
```

Run: `npx vitest run src/components/history/HistoryEntry.test.tsx` — expected: PASS.

- [ ] **Step 3: Update HistoryPage**

In `src/components/history/HistoryPage.tsx`, add the new hooks and build day entries. Add imports:

```tsx
import { useFields } from '../../hooks/useFields'
import { useFieldValuesBulk } from '../../hooks/useFieldValuesBulk'
import type { HistoryItem } from './HistoryEntry'
```

After the existing `useLogs` call add:

```tsx
const { fields, loading: fieldsLoading } = useFields()
const { values, loading: valuesLoading } = useFieldValuesBulk(fromDate, toDate)

const days = useMemo(() => {
  const logByDate = new Map(logs.map(l => [l.date, l]))
  const itemsByDate = new Map<string, HistoryItem[]>()
  const fieldById = new Map(fields.map(f => [f.id, f]))
  for (const v of values) {
    const field = fieldById.get(v.field_id)
    if (!field) continue
    const list = itemsByDate.get(v.date) ?? []
    list.push({ field, value: v.value })
    itemsByDate.set(v.date, list)
  }
  const dates = Array.from(new Set([...logByDate.keys(), ...itemsByDate.keys()]))
    .sort((a, b) => b.localeCompare(a))
  return dates.map(date => ({
    date,
    sleepHours: logByDate.get(date)?.sleep_hours ?? null,
    items: (itemsByDate.get(date) ?? []).sort((a, b) => a.field.sort_order - b.field.sort_order),
  }))
}, [logs, fields, values])
```

Update the loading check to `if (loading || fieldsLoading || valuesLoading)`, the empty check to `days.length === 0`, and the list render to:

```tsx
days.map(day => <HistoryEntry key={day.date} {...day} />)
```

(The export handler changes in Task 13 — leave it as is for now, it still compiles against the current `buildCsvRows` signature.)

- [ ] **Step 4: Full check and commit**

Run: `npm test` && `npm run build` — expected: PASS/clean.

```bash
git add src/components/history
git commit -m "feat: render history entries from custom field values"
```

---

### Task 13: Export with dynamic field columns

**Files:**
- Modify: `src/lib/exportData.ts`
- Rewrite: `src/lib/export.ts`
- Modify: `src/components/history/HistoryPage.tsx` (export handler)
- Test: `src/lib/export.test.ts` (rewrite), `src/lib/exportData.test.ts` (update)

**Interfaces:**
- Consumes: `displayValue` (Task 2).
- Produces:
  - `ExportData` gains `fields: CustomField[]` (all fields, by `sort_order`, archived included) and `fieldValues: FieldValue[]`.
  - `buildCsvRows(data: ExportData): string` — header: `date`, one column per field (current name), one per medication (`Name (dose)`), then `sleep_hours, sleep_quality, bedtime, wake_time, tonight_bedtime`. Rows: union of log dates and value dates, descending; field cells via `displayValue`, blank when absent.
  - `downloadPdf(data: ExportData, dateRange: string, filename: string): Promise<void>` — same columns via jspdf-autotable.
  - `downloadCsv(content: string, filename: string)` unchanged.

- [ ] **Step 1: Rewrite the export test**

Replace `src/lib/export.test.ts` content for `buildCsvRows` (keep any `downloadCsv` DOM tests as they are):

```ts
import { describe, it, expect } from 'vitest'
import { buildCsvRows } from './export'
import type { ExportData } from './exportData'
import type { CustomField, DailyLog } from './database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})

const log = (over: Partial<DailyLog>): DailyLog => ({
  id: 'l1', user_id: 'u1', date: '2026-07-06',
  mood_rating: null, mood_energy: null, mood_anxiety: null,
  meals_count: null, exercised: null, sleep_hours: 7.5, sleep_quality: 4,
  bedtime: '23:00:00', wake_time: '06:30:00', tonight_bedtime: null,
  gratitude: null, created_at: '', updated_at: '',
})

const data = (over: Partial<ExportData>): ExportData => ({
  logs: [], medications: [], medLogs: [], fields: [], fieldValues: [], ...over,
})

describe('buildCsvRows', () => {
  it('emits one column per field with display-formatted values', () => {
    const mood = field({})
    const tags = field({ id: 'f2', name: 'Triggers', type: 'tags', config: { options: ['work'] }, sort_order: 1 })
    const csv = buildCsvRows(data({
      logs: [log({})],
      fields: [mood, tags],
      fieldValues: [
        { id: 'v1', user_id: 'u1', field_id: 'f1', date: '2026-07-06', value: 7, created_at: '' },
        { id: 'v2', user_id: 'u1', field_id: 'f2', date: '2026-07-06', value: ['work'], created_at: '' },
      ],
    }))
    const [header, row] = csv.split('\n')
    expect(header).toBe('date,Mood,Triggers,sleep_hours,sleep_quality,bedtime,wake_time,tonight_bedtime')
    expect(row).toBe('2026-07-06,7/10,work,7.5,4,23:00:00,06:30:00,')
  })

  it('includes days that only have field values (no daily_logs row)', () => {
    const csv = buildCsvRows(data({
      fields: [field({})],
      fieldValues: [{ id: 'v1', user_id: 'u1', field_id: 'f1', date: '2026-07-05', value: 3, created_at: '' }],
    }))
    expect(csv.split('\n')[1]).toBe('2026-07-05,3/10,,,,,')
  })

  it('escapes commas in values', () => {
    const notes = field({ id: 'f3', name: 'Notes', type: 'text', config: {} })
    const csv = buildCsvRows(data({
      fields: [notes],
      fieldValues: [{ id: 'v1', user_id: 'u1', field_id: 'f3', date: '2026-07-05', value: 'a, b', created_at: '' }],
    }))
    expect(csv.split('\n')[1]).toContain('"a, b"')
  })
})
```

Run: `npx vitest run src/lib/export.test.ts` — expected: FAIL.

- [ ] **Step 2: Update exportData**

In `src/lib/exportData.ts`, extend the interface and fetch:

```ts
import { format, subDays } from 'date-fns'
import { supabase } from './supabase'
import type { CustomField, DailyLog, FieldValue, Medication, MedicationLog } from './database.types'

export type ExportRange = '30' | '90' | 'all'

export interface ExportData {
  logs: DailyLog[]
  medications: Medication[]
  medLogs: MedicationLog[]
  fields: CustomField[]
  fieldValues: FieldValue[]
}

export async function fetchExportData(range: ExportRange): Promise<ExportData> {
  const today = format(new Date(), 'yyyy-MM-dd')

  let logsQuery = supabase
    .from('daily_logs')
    .select('*')
    .lte('date', today)
    .order('date', { ascending: false })
  let medLogsQuery = supabase
    .from('medication_logs')
    .select('*')
    .lte('date', today)
  let valuesQuery = supabase
    .from('field_values')
    .select('*')
    .lte('date', today)

  if (range !== 'all') {
    const from = format(subDays(new Date(), range === '30' ? 30 : 90), 'yyyy-MM-dd')
    logsQuery = logsQuery.gte('date', from)
    medLogsQuery = medLogsQuery.gte('date', from)
    valuesQuery = valuesQuery.gte('date', from)
  }

  const [logsRes, medsRes, medLogsRes, fieldsRes, valuesRes] = await Promise.all([
    logsQuery,
    supabase
      .from('medications')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true }),
    medLogsQuery,
    supabase.from('custom_fields').select('*').order('sort_order', { ascending: true }),
    valuesQuery,
  ])

  const error =
    logsRes.error ?? medsRes.error ?? medLogsRes.error ?? fieldsRes.error ?? valuesRes.error
  if (error) throw new Error(error.message)

  return {
    logs: logsRes.data ?? [],
    medications: medsRes.data ?? [],
    medLogs: medLogsRes.data ?? [],
    fields: fieldsRes.data ?? [],
    fieldValues: valuesRes.data ?? [],
  }
}
```

Update `src/lib/exportData.test.ts`: its mock is already keyed by table name, so add the two new tables to the `beforeEach`:

```ts
beforeEach(() => {
  responses['daily_logs'] = { data: [{ id: 'l1' }], error: null }
  responses['medications'] = { data: [{ id: 'm1' }], error: null }
  responses['medication_logs'] = { data: [{ id: 'ml1' }], error: null }
  responses['custom_fields'] = { data: [{ id: 'f1' }], error: null }
  responses['field_values'] = { data: [{ id: 'v1' }], error: null }
})
```

Extend the first test with:

```ts
expect(result.fields).toEqual([{ id: 'f1' }])
expect(result.fieldValues).toEqual([{ id: 'v1' }])
```

And extend the two range tests with the same assertion pattern for the new range-bound table:

```ts
// in 'applies a lower date bound for fixed ranges':
expect(queries['field_values'].gte).toHaveBeenCalled()
// in 'applies no lower date bound for the all-time range':
expect(queries['field_values'].gte).not.toHaveBeenCalled()
```

Run: `npx vitest run src/lib/exportData.test.ts` — expected: PASS after the Step 2 changes.

- [ ] **Step 3: Rewrite export.ts**

Replace `src/lib/export.ts`:

```ts
import type { ExportData } from './exportData'
import { displayValue } from './fields'

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

interface ExportRow {
  date: string
  fieldCells: string[]
  medCells: string[]
  sleepCells: (string | number | null)[]
}

function buildRows(data: ExportData): ExportRow[] {
  const { logs, medications, medLogs, fields, fieldValues } = data

  const takenMap = new Map<string, boolean>()
  for (const ml of medLogs) takenMap.set(`${ml.date}::${ml.medication_id}`, ml.taken)

  const valueMap = new Map<string, string>()
  const fieldById = new Map(fields.map(f => [f.id, f]))
  for (const v of fieldValues) {
    const field = fieldById.get(v.field_id)
    if (field) valueMap.set(`${v.date}::${v.field_id}`, displayValue(field, v.value))
  }

  const logByDate = new Map(logs.map(l => [l.date, l]))
  const dates = Array.from(
    new Set([...logs.map(l => l.date), ...fieldValues.map(v => v.date)])
  ).sort((a, b) => b.localeCompare(a))

  return dates.map(date => {
    const log = logByDate.get(date)
    return {
      date,
      fieldCells: fields.map(f => valueMap.get(`${date}::${f.id}`) ?? ''),
      medCells: medications.map(m => {
        const taken = takenMap.get(`${date}::${m.id}`)
        return taken === true ? 'yes' : taken === false ? 'no' : ''
      }),
      sleepCells: [
        log?.sleep_hours ?? null,
        log?.sleep_quality ?? null,
        log?.bedtime ?? null,
        log?.wake_time ?? null,
        log?.tonight_bedtime ?? null,
      ],
    }
  })
}

const SLEEP_HEADERS = ['sleep_hours', 'sleep_quality', 'bedtime', 'wake_time', 'tonight_bedtime']

export function buildCsvRows(data: ExportData): string {
  const headers = [
    'date',
    ...data.fields.map(f => f.name),
    ...data.medications.map(m => `${m.name} (${m.dose})`),
    ...SLEEP_HEADERS,
  ]
  const rows = buildRows(data).map(r =>
    [r.date, ...r.fieldCells, ...r.medCells, ...r.sleepCells].map(escapeCsv).join(',')
  )
  return [headers.map(escapeCsv).join(','), ...rows].join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(
  data: ExportData,
  dateRange: string,
  filename: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Mood Tracker', 14, 16)
  doc.setFontSize(10)
  doc.text(dateRange, 14, 24)

  const head = [[
    'Date',
    ...data.fields.map(f => f.name),
    ...data.medications.map(m => `${m.name} (${m.dose})`),
    'Sleep h', 'Sleep Q', 'Bedtime', 'Wake', 'Tonight bed',
  ]]

  const body = buildRows(data).map(r => [
    r.date,
    ...r.fieldCells,
    ...r.medCells.map(c => (c === 'yes' ? 'Y' : c === 'no' ? 'N' : '')),
    r.sleepCells[0] ?? '',
    r.sleepCells[1] ?? '',
    typeof r.sleepCells[2] === 'string' ? r.sleepCells[2].slice(0, 5) : '',
    typeof r.sleepCells[3] === 'string' ? r.sleepCells[3].slice(0, 5) : '',
    typeof r.sleepCells[4] === 'string' ? r.sleepCells[4].slice(0, 5) : '',
  ])

  autoTable(doc, { head, body, startY: 30, styles: { fontSize: 7 } })
  doc.save(filename)
}
```

- [ ] **Step 4: Update the HistoryPage export handler**

In `src/components/history/HistoryPage.tsx` `handleExport`, replace the destructure + calls:

```tsx
const exportData = await fetchExportData(exportRange)

const rangeLabel =
  exportRange === 'all' ? 'All time' : `Last ${exportRange} days`
const filename = `mood-tracker-${format(new Date(), 'yyyy-MM-dd')}`

if (exportFormat === 'csv') {
  downloadCsv(buildCsvRows(exportData), `${filename}.csv`)
} else {
  await downloadPdf(exportData, rangeLabel, `${filename}.pdf`)
}
```

- [ ] **Step 5: Full check and commit**

Run: `npm test` && `npm run build` — expected: PASS/clean.

```bash
git add src/lib/export.ts src/lib/export.test.ts src/lib/exportData.ts src/lib/exportData.test.ts src/components/history/HistoryPage.tsx
git commit -m "feat: export CSV and PDF with dynamic custom field columns"
```

---

## Final verification

- [ ] `npm test` — full suite green.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — clean.
- [ ] Manual smoke test (`npm run dev`): log a day with a newly added custom field; rename a field; archive one; check Charts (auto chart + overlay + correlations), History, and a CSV export.
- [ ] Verify in Supabase that legacy columns stopped receiving writes (edit today's log, confirm `mood_rating` unchanged) while `field_values` rows appear.
