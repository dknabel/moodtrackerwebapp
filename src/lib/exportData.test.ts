import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchExportData } from './exportData'

interface MockResponse {
  data: unknown[] | null
  error: { message: string } | null
}

const { responses, queries } = vi.hoisted(() => ({
  responses: {} as Record<string, MockResponse>,
  queries: {} as Record<string, { gte: ReturnType<typeof vi.fn> }>,
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const q = {
        select: vi.fn(() => q),
        eq: vi.fn(() => q),
        gte: vi.fn(() => q),
        lte: vi.fn(() => q),
        order: vi.fn(() => q),
        then: (resolve: (r: MockResponse) => void) => resolve(responses[table]),
      }
      queries[table] = q
      return q
    }),
  },
}))

beforeEach(() => {
  responses['daily_logs'] = { data: [{ id: 'l1' }], error: null }
  responses['medications'] = { data: [{ id: 'm1' }], error: null }
  responses['medication_logs'] = { data: [{ id: 'ml1' }], error: null }
  responses['custom_fields'] = { data: [{ id: 'f1' }], error: null }
  responses['field_values'] = { data: [{ id: 'v1' }], error: null }
})

describe('fetchExportData', () => {
  it('returns logs, medications and medication logs', async () => {
    const result = await fetchExportData('30')
    expect(result.logs).toEqual([{ id: 'l1' }])
    expect(result.medications).toEqual([{ id: 'm1' }])
    expect(result.medLogs).toEqual([{ id: 'ml1' }])
    expect(result.fields).toEqual([{ id: 'f1' }])
    expect(result.fieldValues).toEqual([{ id: 'v1' }])
  })

  it('throws when any query fails instead of exporting partial data', async () => {
    responses['medication_logs'] = { data: null, error: { message: 'RLS violation' } }
    await expect(fetchExportData('30')).rejects.toThrow('RLS violation')
  })

  it('applies a lower date bound for fixed ranges', async () => {
    await fetchExportData('90')
    expect(queries['daily_logs'].gte).toHaveBeenCalled()
    expect(queries['medication_logs'].gte).toHaveBeenCalled()
    expect(queries['field_values'].gte).toHaveBeenCalled()
  })

  it('applies no lower date bound for the all-time range', async () => {
    await fetchExportData('all')
    expect(queries['daily_logs'].gte).not.toHaveBeenCalled()
    expect(queries['medication_logs'].gte).not.toHaveBeenCalled()
    expect(queries['field_values'].gte).not.toHaveBeenCalled()
  })
})
