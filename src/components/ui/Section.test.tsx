import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Section } from './Section'

describe('Section', () => {
  it('renders an uppercase mono eyebrow label and children', () => {
    render(<Section title="Sleep"><p>content</p></Section>)
    const heading = screen.getByRole('heading', { name: 'Sleep' })
    expect(heading.className).toContain('font-mono')
    expect(heading.className).toContain('uppercase')
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders without a card box (no surface background)', () => {
    const { container } = render(<Section title="Mood"><p>x</p></Section>)
    expect(container.firstElementChild!.className).not.toMatch(/bg-surface|rounded-xl|shadow/)
  })
})
