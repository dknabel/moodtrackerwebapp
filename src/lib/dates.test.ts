import { describe, it, expect } from 'vitest'
import { formatDay, formatTime } from './dates'

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

describe('formatTime', () => {
  it('formats a morning time with AM', () => {
    expect(formatTime('08:00')).toBe('8:00 AM')
  })

  it('formats an afternoon time with PM', () => {
    expect(formatTime('13:30')).toBe('1:30 PM')
  })

  it('formats midnight and noon correctly', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
    expect(formatTime('12:00')).toBe('12:00 PM')
  })

  it('handles seconds in the input', () => {
    expect(formatTime('08:00:00')).toBe('8:00 AM')
  })

  it('returns malformed input unchanged', () => {
    expect(formatTime('not-a-time')).toBe('not-a-time')
  })
})
