import { describe, it, expect } from 'vitest'
import { greeting } from './greeting'

describe('greeting', () => {
  it('returns morning before noon, afternoon before 18, evening after', () => {
    expect(greeting(new Date('2026-07-24T08:00:00'))).toBe('morning')
    expect(greeting(new Date('2026-07-24T14:00:00'))).toBe('afternoon')
    expect(greeting(new Date('2026-07-24T21:00:00'))).toBe('evening')
  })
})
