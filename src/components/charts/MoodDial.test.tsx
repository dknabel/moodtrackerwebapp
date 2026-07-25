import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MoodDial } from './MoodDial'

describe('MoodDial', () => {
  it('shows the current value and delta vs recent average', () => {
    render(<MoodDial value={8} min={1} max={10} recent={[6, 7]} />)
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText(/\+1\.5/)).toBeInTheDocument()
  })

  it('shows a placeholder when there is no value', () => {
    render(<MoodDial value={null} min={1} max={10} recent={[]} />)
    expect(screen.getByText('–')).toBeInTheDocument()
  })

  it('labels itself for screen readers', () => {
    render(<MoodDial value={8} min={1} max={10} recent={[6, 7]} />)
    expect(screen.getByRole('img', { name: /mood 8 of 10/i })).toBeInTheDocument()
  })
})
