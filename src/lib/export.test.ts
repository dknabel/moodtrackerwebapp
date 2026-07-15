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
  gratitude: null, created_at: '', updated_at: '', ...over,
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
