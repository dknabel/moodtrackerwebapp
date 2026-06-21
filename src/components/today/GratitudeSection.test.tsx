import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GratitudeSection } from './GratitudeSection'

describe('GratitudeSection', () => {
  it('renders the section heading', () => {
    render(<GratitudeSection value="" onChange={vi.fn()} />)
    expect(screen.getByText('Gratitude')).toBeInTheDocument()
  })

  it('renders the textarea with placeholder', () => {
    render(<GratitudeSection value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('What are you grateful for today?')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<GratitudeSection value="Sunny weather" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Sunny weather')).toBeInTheDocument()
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    render(<GratitudeSection value="" onChange={onChange} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'A')
    expect(onChange).toHaveBeenCalledWith('A')
  })
})
