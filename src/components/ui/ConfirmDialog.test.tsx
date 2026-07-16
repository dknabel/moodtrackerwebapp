import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

const props = {
  title: 'Archive Mood?',
  message: 'Its history is kept.',
  confirmLabel: 'Archive',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('ConfirmDialog', () => {
  it('renders title and message in an alertdialog', () => {
    render(<ConfirmDialog {...props} />)
    const dialog = screen.getByRole('alertdialog', { name: 'Archive Mood?' })
    expect(dialog).toHaveTextContent('Its history is kept.')
  })

  it('focuses Cancel initially', () => {
    render(<ConfirmDialog {...props} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('calls onConfirm from the confirm button', async () => {
    render(<ConfirmDialog {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(props.onConfirm).toHaveBeenCalledOnce()
    expect(props.onCancel).not.toHaveBeenCalled()
  })

  it('cancels on Cancel click and on Escape', async () => {
    render(<ConfirmDialog {...props} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.keyboard('{Escape}')
    expect(props.onCancel).toHaveBeenCalledTimes(2)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })
})
