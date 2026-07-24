import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { BottomNav } from './BottomNav'

describe('BottomNav', () => {
  it('renders all four tabs with mono uppercase labels', () => {
    render(<MemoryRouter><BottomNav /></MemoryRouter>)
    for (const label of ['Today', 'History', 'Charts', 'Reminders']) {
      const link = screen.getByRole('link', { name: label })
      expect(link.className).toContain('font-mono')
      expect(link.className).toContain('uppercase')
    }
  })

  it('marks the active tab with clay, not blue', () => {
    render(<MemoryRouter initialEntries={['/']}><BottomNav /></MemoryRouter>)
    const today = screen.getByRole('link', { name: 'Today' })
    expect(today.className).toContain('text-clay')
    expect(today.className).not.toMatch(/blue/)
  })
})
