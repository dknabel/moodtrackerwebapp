import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SleepSection } from './SleepSection'

const defaults = {
  bedtime: '',
  wake_time: '',
  sleep_hours: null as number | null,
  sleep_quality: 3,
}

describe('SleepSection', () => {
  it('renders bedtime and wake time inputs', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/bedtime/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wake time/i)).toBeInTheDocument()
  })

  it('auto-calculates sleep hours when both times are set', async () => {
    const onChange = vi.fn()
    render(<SleepSection values={defaults} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText(/bedtime/i), '22:00')
    await userEvent.type(screen.getByLabelText(/wake time/i), '06:00')

    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(lastCall.sleep_hours).toBe(8)
    })
  })
})
