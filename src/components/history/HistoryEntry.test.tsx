import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { HistoryEntry } from './HistoryEntry'
import type { CustomField } from '../../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})

const renderEntry = (
  items: Array<{ field: CustomField; value: number | boolean | string | string[] }>,
  date = '2026-01-05'
) =>
  render(
    <MemoryRouter>
      <HistoryEntry date={date} sleepHours={7.5} items={items} />
    </MemoryRouter>
  )

describe('HistoryEntry', () => {
  it('shows the date, sleep, and formatted field values', () => {
    renderEntry([
      { field: field({}), value: 7 },
      { field: field({ id: 'f2', name: 'Meditated', type: 'toggle', config: {} }), value: true },
    ])
    expect(screen.getByText(/Jan 5/)).toBeInTheDocument()
    expect(screen.getByText('Sleep 7.5h')).toBeInTheDocument()
    expect(screen.getByText('Mood 7/10')).toBeInTheDocument()
    expect(screen.getByText('Meditated: Yes')).toBeInTheDocument()
  })

  it('renders text values as a quote block', () => {
    renderEntry([{ field: field({ id: 'f3', name: 'Notes', type: 'text', config: {} }), value: 'a good day' }])
    expect(screen.getByText('"a good day"')).toBeInTheDocument()
  })

  it('shows Yesterday for the previous day', () => {
    renderEntry([], format(subDays(new Date(), 1), 'yyyy-MM-dd'))
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
  })

  it('shows a short human date instead of the ISO string', () => {
    renderEntry([], '2026-01-05')
    expect(screen.queryByText('2026-01-05')).not.toBeInTheDocument()
    expect(screen.getByText(/Jan 5/)).toBeInTheDocument()
  })
})
