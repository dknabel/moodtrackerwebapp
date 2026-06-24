import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManageMedsModal } from './ManageMedsModal'
import type { Medication } from '../../lib/database.types'

const med: Medication = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}

const defaultProps = {
  medications: [] as Medication[],
  onAdd: vi.fn().mockResolvedValue(undefined),
  onUpdate: vi.fn().mockResolvedValue(undefined),
  onDeactivate: vi.fn().mockResolvedValue(undefined),
  onClose: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('ManageMedsModal', () => {
  it('renders a list of medications', () => {
    render(<ManageMedsModal {...defaultProps} medications={[med]} />)
    expect(screen.getByText('Lithium')).toBeInTheDocument()
    expect(screen.getByText('300mg')).toBeInTheDocument()
  })

  it('calls onAdd with correct data when add form is submitted', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(<ManageMedsModal {...defaultProps} onAdd={onAdd} />)
    await userEvent.type(screen.getByPlaceholderText('Name (required)'), 'Lamictal')
    await userEvent.type(screen.getByPlaceholderText('Dose (required)'), '100mg')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lamictal', dose: '100mg' })
    )
  })

  it('does not call onAdd when name or dose is empty', async () => {
    const onAdd = vi.fn()
    render(<ManageMedsModal {...defaultProps} onAdd={onAdd} />)
    await userEvent.type(screen.getByPlaceholderText('Name (required)'), 'Lamictal')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onDeactivate when Delete button is clicked', async () => {
    const onDeactivate = vi.fn().mockResolvedValue(undefined)
    render(<ManageMedsModal {...defaultProps} medications={[med]} onDeactivate={onDeactivate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeactivate).toHaveBeenCalledWith('m1')
  })

  it('calls onClose when Close button is clicked', async () => {
    const onClose = vi.fn()
    render(<ManageMedsModal {...defaultProps} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('enters edit mode and calls onUpdate on save', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<ManageMedsModal {...defaultProps} medications={[med]} onUpdate={onUpdate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    // clear dose field and type new value
    const doseInput = screen.getByDisplayValue('300mg')
    await userEvent.clear(doseInput)
    await userEvent.type(doseInput, '600mg')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onUpdate).toHaveBeenCalledWith('m1', expect.objectContaining({ dose: '600mg' }))
  })
})
