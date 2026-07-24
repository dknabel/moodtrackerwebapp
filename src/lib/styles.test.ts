import { describe, it, expect } from 'vitest'
import { focusRing, btnPrimary, btnSecondary, linkText, eyebrow } from './styles'

describe('style helpers', () => {
  it('uses clay tokens, never legacy palette colors', () => {
    // Word boundaries keep 'red' from matching inside words like 'expired'.
    const legacy = /\b(blue|gray|slate|zinc|neutral|sky|stone|red|green)\b/
    for (const cls of [focusRing, btnPrimary, btnSecondary, linkText, eyebrow]) {
      expect(cls).not.toMatch(legacy)
    }
    expect(focusRing).toContain('ring-clay')
    expect(btnPrimary).toContain('bg-clay')
  })
})
