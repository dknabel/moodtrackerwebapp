import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('warns before an incompatible type change', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(window.confirm).toHaveBeenCalled()
    expect(handlers.onUpdate).not.toHaveBeenCalled()
  })

  it('archives with confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderModal()
    await userEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(handlers.onArchive).toHaveBeenCalledWith('f1')
  })

  it('hard delete requires typing DELETE', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('nope')
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).not.toHaveBeenCalled()
    vi.spyOn(window, 'prompt').mockReturnValue('DELETE')
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(handlers.onDelete).toHaveBeenCalledWith('f3')
  })
})
