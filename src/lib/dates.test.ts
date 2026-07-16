import { describe, it, expect } from 'vitest'
import { formatDay } from './dates'

// Fixed "now" so tests are deterministic: Wednesday 2026-07-15.
const now = new Date(2026, 6, 15, 12, 0, 0)

describe('formatDay', () => {
  it('returns Today for the current date', () => {
    expect(formatDay('2026-07-15', now)).toBe('Today')
  })

  it('returns Yesterday for the previous date', () => {
    expect(formatDay('2026-07-14', now)).toBe('Yesterday')
  })

  it('formats other dates in the current year without the year', () => {
    expect(formatDay('2026-07-01', now)).toBe('Wed, Jul 1')
  })

  it('appends the year for dates in a different year', () => {
    expect(formatDay('2025-12-31', now)).toBe('Wed, Dec 31, 2025')
  })

  it('returns malformed input unchanged', () => {
    expect(formatDay('not-a-date', now)).toBe('not-a-date')
  })
})
