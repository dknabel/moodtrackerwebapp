import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoodSection } from './FoodSection'

describe('FoodSection', () => {
  it('renders the meals count', () => {
    render(<FoodSection value={3} onChange={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('increments meals count', async () => {
    const onChange = vi.fn()
    render(<FoodSection value={2} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /\+/i }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('decrements meals count and does not go below 0', async () => {
    const onChange = vi.fn()
    render(<FoodSection value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /−/i }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
