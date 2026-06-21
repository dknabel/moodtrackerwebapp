import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseSection } from './ExerciseSection'

describe('ExerciseSection', () => {
  it('shows unchecked state', () => {
    render(<ExerciseSection value={false} onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('calls onChange when toggled', async () => {
    const onChange = vi.fn()
    render(<ExerciseSection value={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
