import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { HistoryEntry } from './HistoryEntry'

const renderEntry = (date: string) =>
  render(
    <MemoryRouter>
      <HistoryEntry date={date} sleepHours={7.5} items={[]} />
    </MemoryRouter>
  )

describe('HistoryEntry', () => {
  it('shows Yesterday for the previous day', () => {
    renderEntry(format(subDays(new Date(), 1), 'yyyy-MM-dd'))
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })

  it('shows a short human date instead of the ISO string', () => {
    renderEntry('2026-01-05')
    expect(screen.queryByText('2026-01-05')).not.toBeInTheDocument()
    expect(screen.getByText(/Jan 5/)).toBeInTheDocument()
  })
})
