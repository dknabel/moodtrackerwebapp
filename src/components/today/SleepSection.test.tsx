import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SleepSection } from './SleepSection'

const defaults = {
  bedtime: '',
  wake_time: '',
  sleep_hours: null as number | null,
  sleep_quality: 3,
  tonight_bedtime: '',
}

describe('SleepSection', () => {
  it('renders "Last night\'s sleep" and "Tonight" sub-section headings', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByText("Last night's sleep")).toBeInTheDocument()
    expect(screen.getByText('Tonight')).toBeInTheDocument()
  })

  it('renders a "Tonight\'s bedtime" field', () => {
    render(<SleepSection values={defaults} onChange={vi.fn()} />)
    expect(screen.getByLabelText("Tonight's bedtime")).toBeInTheDocument()
  })

  it('auto-calculates sleep hours from bedtime prop and typed wake time', async () => {
    const onChange = vi.fn()
    render(<SleepSection values={{ ...defaults, bedtime: '22:00' }} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Wake time'), '06:00')
    await waitFor(() => {
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
      expect(last.sleep_hours).toBe(8)
    })
  })

  it('propagates tonight_bedtime through onChange without affecting sleep_hours', async () => {
    const onChange = vi.fn()
    render(<SleepSection values={defaults} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText("Tonight's bedtime"), '23:00')
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(last.tonight_bedtime).toBe('23:00')
    expect(last.sleep_hours).toBeNull()
  })
})
