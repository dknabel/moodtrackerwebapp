import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildCsvRows, downloadPdf } from './export'
import type { DailyLog, Medication, MedicationLog } from './database.types'

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function (this: Record<string, unknown>) {
    this.setFontSize = vi.fn()
    this.text = vi.fn()
    this.save = vi.fn()
  }),
}))
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }))

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

  it('escapes medication names containing commas in the header row', () => {
    const med = makeMed('m1', 'Lithium, extended release', '300mg')
    const csv = buildCsvRows([makeLog()], [med], [])
    const [header] = csv.split('\n')
    expect(header).toContain('"Lithium, extended release (300mg)"')
  })
})

describe('downloadPdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('includes a tonight bedtime column in head and body', async () => {
    const { default: autoTable } = await import('jspdf-autotable')
    await downloadPdf([makeLog()], [], [], 'Last 30 days', 'f.pdf')
    const options = vi.mocked(autoTable).mock.calls[0][1]
    expect(options.head![0]).toContain('Tonight bed')
    expect(options.body![0]).toContain('22:00')
  })
})
