import { describe, it, expect } from 'vitest'
import { buildCsvRows } from './export'
import type { DailyLog, Medication, MedicationLog } from './database.types'

const makeLog = (overrides: Partial<DailyLog> = {}): DailyLog => ({
  id: '1', user_id: 'u1', date: '2026-06-01',
  mood_rating: 7, mood_energy: 6, mood_anxiety: 3,
  meals_count: 3, exercised: true,
  sleep_hours: 7.5, sleep_quality: 4,
  bedtime: '22:00:00', wake_time: '06:30:00',
  tonight_bedtime: '22:00:00', gratitude: 'good day',
  created_at: '', updated_at: '',
  ...overrides,
})

const makeMed = (id: string, name: string, dose: string): Medication => ({
  id, user_id: 'u1', name, dose,
  scheduled_time: null, active: true, created_at: '',
})

const makeMedLog = (medicationId: string, taken: boolean): MedicationLog => ({
  id: 'ml1', user_id: 'u1', date: '2026-06-01',
  medication_id: medicationId, taken, taken_at: null, created_at: '',
})

describe('buildCsvRows', () => {
  it('produces correct headers with no medications', () => {
    const csv = buildCsvRows([makeLog()], [], [])
    const [header] = csv.split('\n')
    expect(header).toBe(
      'date,mood_rating,mood_energy,mood_anxiety,meals_count,exercised,sleep_hours,sleep_quality,bedtime,wake_time,tonight_bedtime,gratitude'
    )
  })

  it('includes medication columns in header', () => {
    const med = makeMed('m1', 'Lithium', '300mg')
    const csv = buildCsvRows([makeLog()], [med], [])
    const [header] = csv.split('\n')
    expect(header).toContain('Lithium (300mg)')
  })

  it('marks medication as yes when taken=true', () => {
    const med = makeMed('m1', 'Lithium', '300mg')
    const medLog = makeMedLog('m1', true)
    const csv = buildCsvRows([makeLog()], [med], [medLog])
    const rows = csv.split('\n')
    expect(rows[1]).toContain('yes')
  })

  it('marks medication as no when taken=false', () => {
    const med = makeMed('m1', 'Lithium', '300mg')
    const medLog = makeMedLog('m1', false)
    const csv = buildCsvRows([makeLog()], [med], [medLog])
    const rows = csv.split('\n')
    expect(rows[1]).toContain('no')
  })

  it('wraps fields containing commas in double quotes', () => {
    const log = makeLog({ gratitude: 'health, family, friends' })
    const csv = buildCsvRows([log], [], [])
    expect(csv).toContain('"health, family, friends"')
  })

  it('escapes double quotes inside fields', () => {
    const log = makeLog({ gratitude: 'she said "hello"' })
    const csv = buildCsvRows([log], [], [])
    expect(csv).toContain('"she said ""hello"""')
  })

  it('formats exercised as yes/no', () => {
    const csv = buildCsvRows([makeLog({ exercised: true })], [], [])
    const [, row] = csv.split('\n')
    expect(row).toContain('yes')
  })
})
