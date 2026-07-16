import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useModal } from './useModal'

function TestModal({ onClose, label }: { onClose: () => void; label: string }) {
  const ref = useModal(onClose)
  return (
    <div ref={ref} role="dialog" aria-label={label}>
      <button>{label}-first</button>
      <button>{label}-last</button>
    </div>
  )
}

describe('useModal', () => {
  it('focuses the first focusable element on mount', () => {
    render(<TestModal onClose={() => {}} label="m" />)
    expect(screen.getByRole('button', { name: 'm-first' })).toHaveFocus()
  })

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = render(<TestModal onClose={() => {}} label="m" />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    render(<TestModal onClose={onClose} label="m" />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('only the topmost modal closes on Escape when stacked', async () => {
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    render(
      <>
        <TestModal onClose={closeOuter} label="outer" />
        <TestModal onClose={closeInner} label="inner" />
      </>
    )
    await userEvent.keyboard('{Escape}')
    expect(closeInner).toHaveBeenCalledOnce()
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('restores the original body overflow when modals close out of order', () => {
    const outer = render(<TestModal onClose={() => {}} label="outer" />)
    const inner = render(<TestModal onClose={() => {}} label="inner" />)
    outer.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    inner.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('wraps Tab focus from last back to first', async () => {
    render(<TestModal onClose={() => {}} label="m" />)
    screen.getByRole('button', { name: 'm-last' }).focus()
    await userEvent.keyboard('{Tab}')
    expect(screen.getByRole('button', { name: 'm-first' })).toHaveFocus()
  })
})
