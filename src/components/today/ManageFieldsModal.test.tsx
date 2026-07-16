import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ManageFieldsModal } from './ManageFieldsModal'
import type { CustomField } from '../../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})
const mood = field({})
const archived = field({ id: 'f3', name: 'Old habit', type: 'toggle', config: {}, sort_order: 2, active: false })

const handlers = {
  onAdd: vi.fn().mockResolvedValue(null),
  onUpdate: vi.fn().mockResolvedValue(null),
  onArchive: vi.fn().mockResolvedValue(null),
  onReactivate: vi.fn().mockResolvedValue(null),
  onDelete: vi.fn().mockResolvedValue(null),
  onMove: vi.fn().mockResolvedValue(null),
  onClose: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

const renderModal = (fields = [mood, archived]) =>
  render(<ManageFieldsModal fields={fields} {...handlers} />)

describe('ManageFieldsModal', () => {
  it('lists active and archived fields separately', () => {
    renderModal()
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
    expect(screen.getByText('Old habit')).toBeInTheDocument()
  })

  it('adds a field after validation passes', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Name (required)'), 'Stress')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(handlers.onAdd).toHaveBeenCalledWith({
      name: 'Stress', type: 'slider', config: { min: 1, max: 10, lowLabel: '', highLabel: '' },
    })
  })

  it('rejects a duplicate name without calling onAdd', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Name (required)'), 'mood')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(handlers.onAdd).not.toHaveBeenCalled()
    expect(screen.getByText('A field with this name already exists')).toBeInTheDocument()
  })

  it('warns before an incompatible type change and cancels cleanly', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const dialog = screen.getByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onUpdate).not.toHaveBeenCalled()
  })

  it('applies an incompatible type change after confirming', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Change type' }))
    expect(handlers.onUpdate).toHaveBeenCalledWith('f1', expect.objectContaining({ type: 'text' }))
  })

  it('archives only after confirming the dialog', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(handlers.onArchive).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive' }))
    expect(handlers.onArchive).toHaveBeenCalledWith('f1')
  })

  it('does not archive when the dialog is cancelled', async () => {
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onArchive).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('hard delete requires confirming the dialog', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).toHaveBeenCalledWith('f3')
  })

  it('does not delete when the dialog is cancelled', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
