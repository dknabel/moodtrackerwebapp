import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { format } from 'date-fns'
import { TodayPage } from './TodayPage'
import type { CustomField } from '../../lib/database.types'

const field = (over: Partial<CustomField>): CustomField => ({
  id: 'f1', user_id: 'u1', name: 'Mood', type: 'slider',
  config: { min: 1, max: 10 }, sort_order: 0, active: true,
  show_in_charts: true, created_at: '', ...over,
})

const mockSave = vi.fn().mockResolvedValue({ error: null })
const mockSaveAll = vi.fn().mockResolvedValue({ error: null })

vi.mock('../../hooks/useDailyLog', () => ({
  useDailyLog: vi.fn(() => ({ log: null, loading: false, error: null, save: mockSave })),
}))
vi.mock('../../hooks/useFields', () => ({
  useFields: vi.fn(() => ({
    activeFields: [field({}), field({ id: 'f2', name: 'Meditated', type: 'toggle', config: {}, sort_order: 1 })],
    fields: [], loading: false, error: null,
  })),
}))
vi.mock('../../hooks/useFieldValues', () => ({
  useFieldValues: vi.fn(() => ({ values: { f1: 7 }, loading: false, error: null, saveAll: mockSaveAll })),
}))
vi.mock('./MedsSection', () => ({ MedsSection: () => <div>meds-section</div> }))
vi.mock('./SleepSection', () => ({ SleepSection: () => <div>sleep-section</div> }))

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())

const renderPage = () => render(<MemoryRouter><TodayPage /></MemoryRouter>)

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/log/:date" element={<TodayPage />} />
      </Routes>
    </MemoryRouter>
  )

describe('TodayPage', () => {
  it('renders a section per active field in order', () => {
    renderPage()
    expect(screen.getByText('Mood')).toBeInTheDocument()
    expect(screen.getByText('Meditated')).toBeInTheDocument()
    expect(screen.getByText('sleep-section')).toBeInTheDocument()
    expect(screen.getByText('meds-section')).toBeInTheDocument()
  })

  it('initializes field widgets from stored values', () => {
    renderPage()
    expect(screen.getByRole('slider')).toHaveValue('7')
  })

  it('autosaves sleep columns and field values after edits settle', async () => {
    vi.useFakeTimers()
    renderPage()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } })
    expect(mockSave).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(mockSaveAll).toHaveBeenCalledWith({ f1: 9, f2: false })
    const sleepPayload = mockSave.mock.calls[0][0]
    expect(sleepPayload).toEqual({
      bedtime: null, wake_time: null, sleep_hours: null, sleep_quality: 3, tonight_bedtime: null,
    })
    expect(sleepPayload).not.toHaveProperty('mood_rating')
  })

  it('flushes a pending save on unmount', async () => {
    // Real timers: unmount happens well before the 1s debounce fires, so a
    // save here proves the unmount flush ran.
    const { unmount } = renderPage()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } })
    unmount()
    await waitFor(() => expect(mockSaveAll).toHaveBeenCalledWith({ f1: 9, f2: false }))
  })

  it('does not save when nothing has been edited', async () => {
    vi.useFakeTimers()
    const { unmount } = renderPage()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    unmount()
    await act(async () => { await Promise.resolve() })
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSaveAll).not.toHaveBeenCalled()
  })

  it('shows the save error with a Retry button when saving fails', async () => {
    vi.useFakeTimers()
    mockSaveAll.mockResolvedValueOnce({ error: 'boom' })
    renderPage()
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(screen.getByText(/boom/)).toBeInTheDocument()
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByText(/boom/)).not.toBeInTheDocument())
    expect(mockSaveAll).toHaveBeenCalledTimes(2)
  })
})

describe('TodayPage date param validation', () => {
  it('redirects to home instead of crashing on a malformed date', () => {
    renderAt('/log/not-a-date')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('redirects to home on an impossible calendar date', () => {
    renderAt('/log/2026-13-99')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('renders a friendly heading for a valid past date', () => {
    renderAt('/log/2026-06-15')
    expect(screen.getByRole('heading', { name: /Jun 15/ })).toBeInTheDocument()
  })

  it('shows "Today" for the current date', () => {
    renderAt(`/log/${format(new Date(), 'yyyy-MM-dd')}`)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })
})

describe('TodayPage date navigation', () => {
  it('steps back one day with the previous arrow', async () => {
    renderAt('/log/2026-06-15')
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(screen.getByRole('heading', { name: /Jun 14/ })).toBeInTheDocument()
  })

  it('steps forward one day with the next arrow', async () => {
    renderAt('/log/2026-06-15')
    await userEvent.click(screen.getByRole('button', { name: 'Next day' }))
    expect(screen.getByRole('heading', { name: /Jun 16/ })).toBeInTheDocument()
  })

  it('disables the next arrow on today', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
  })

  it('returns to today via the Today link', async () => {
    renderAt('/log/2026-06-15')
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('hides the Today link when already on today', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
  })

  it('jumps to a chosen date with the date picker', async () => {
    renderAt('/log/2026-06-15')
    fireEvent.change(screen.getByLabelText('Choose date'), { target: { value: '2026-06-10' } })
    expect(await screen.findByRole('heading', { name: /Jun 10/ })).toBeInTheDocument()
  })
})
