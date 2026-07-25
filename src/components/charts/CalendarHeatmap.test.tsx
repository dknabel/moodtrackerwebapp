import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CalendarHeatmap } from './CalendarHeatmap'

describe('CalendarHeatmap', () => {
  it('renders one cell per day of the month with data labels', () => {
    const values = new Map([['2026-07-03', 8]])
    render(<CalendarHeatmap month={new Date(2026, 6, 15)} valuesByDate={values} min={1} max={10} />)
    expect(screen.getByRole('img', { name: /july 2026/i })).toBeInTheDocument()
    expect(screen.getByTitle('2026-07-03: 8')).toBeInTheDocument()
    expect(screen.getByTitle('2026-07-04: no data')).toBeInTheDocument()
  })
})
