import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoodSection } from './MoodSection'

const defaults = { mood_rating: 5, mood_energy: 5, mood_anxiety: 5 }

describe('MoodSection', () => {
  it('renders all three sliders', () => {
    render(<MoodSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Energy')).toBeInTheDocument()
    expect(screen.getByText('Anxiety')).toBeInTheDocument()
  })

  it('calls onChange with updated mood_rating', async () => {
    const onChange = vi.fn()
    render(<MoodSection values={defaults} onChange={onChange} />)
    const sliders = screen.getAllByRole('slider')
    await userEvent.type(sliders[0], '{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mood_rating: 6 }))
  })
})
