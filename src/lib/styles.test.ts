import { describe, it, expect } from 'vitest'
import { focusRing, btnPrimary, btnSecondary, linkText, eyebrow } from './styles'

describe('style helpers', () => {
  it('uses clay tokens, never blue', () => {
    for (const cls of [focusRing, btnPrimary, btnSecondary, linkText, eyebrow]) {
      expect(cls).not.toMatch(/blue|gray/)
    }
    expect(focusRing).toContain('ring-clay')
    expect(btnPrimary).toContain('bg-clay')
  })
})
