import { describe, it, expect } from 'vitest'
import { calculateSleepHours } from './sleep'

describe('calculateSleepHours', () => {
  it('calculates hours for a typical overnight sleep', () => {
    expect(calculateSleepHours('22:00', '06:00')).toBe(8)
  })

  it('calculates hours crossing midnight', () => {
    expect(calculateSleepHours('23:30', '07:00')).toBe(7.5)
  })

  it('handles fractional hours', () => {
    expect(calculateSleepHours('23:00', '06:20')).toBe(7.3)
  })

  it('returns 0 when bedtime equals wake time', () => {
    expect(calculateSleepHours('08:00', '08:00')).toBe(0)
  })
})
