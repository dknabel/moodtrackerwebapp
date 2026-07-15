import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FieldSection } from './FieldSection'
import type { CustomField } from '../../lib/database.types'

const base: Omit<CustomField, 'type' | 'config'> = {
  id: 'f1', user_id: 'u1', name: 'Stress', sort_order: 0,
  active: true, show_in_charts: true, created_at: '',
}

describe('FieldSection', () => {
  it('renders a slider with the field range', () => {
    const field: CustomField = { ...base, type: 'slider', config: { min: 1, max: 5, lowLabel: 'calm', highLabel: 'panicked' } }
    render(<FieldSection field={field} value={3} onChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '1')
    expect(slider).toHaveAttribute('max', '5')
    expect(screen.getByText('calm')).toBeInTheDocument()
    expect(screen.getByText('panicked')).toBeInTheDocument()
  })

  it('renders a stepper for number fields and increments', async () => {
    const field: CustomField = { ...base, name: 'Coffee', type: 'number', config: { unit: 'cups' } }
    const onChange = vi.fn()
    render(<FieldSection field={field} value={2} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '+' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('renders a checkbox for toggle fields', async () => {
    const field: CustomField = { ...base, name: 'Meditated', type: 'toggle', config: {} }
    const onChange = vi.fn()
    render(<FieldSection field={field} value={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('renders a textarea for text fields', async () => {
    const field: CustomField = { ...base, name: 'Notes', type: 'text', config: {} }
    const onChange = vi.fn()
    render(<FieldSection field={field} value="" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('renders tag chips and toggles selection', async () => {
    const field: CustomField = { ...base, name: 'Triggers', type: 'tags', config: { options: ['work', 'family'] } }
    const onChange = vi.fn()
    render(<FieldSection field={field} value={['work']} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'work' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'family' }))
    expect(onChange).toHaveBeenCalledWith(['work', 'family'])
    await userEvent.click(screen.getByRole('button', { name: 'work' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('falls back to the type default when the stored value is incompatible', () => {
    const field: CustomField = { ...base, type: 'slider', config: { min: 1, max: 10 } }
    render(<FieldSection field={field} value="was a note" onChange={() => {}} />)
    expect(screen.getByRole('slider')).toHaveValue('5')
  })
})
