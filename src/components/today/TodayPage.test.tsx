import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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

const renderPage = () => render(<MemoryRouter><TodayPage /></MemoryRouter>)

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

  it('save writes sleep columns to daily_logs and field values to saveAll', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockSaveAll).toHaveBeenCalled())
    expect(mockSaveAll).toHaveBeenCalledWith({ f1: 7, f2: false })
    const sleepPayload = mockSave.mock.calls[0][0]
    expect(sleepPayload).toEqual({
      bedtime: null, wake_time: null, sleep_hours: null, sleep_quality: 3, tonight_bedtime: null,
    })
    expect(sleepPayload).not.toHaveProperty('mood_rating')
    expect(sleepPayload).not.toHaveProperty('gratitude')
  })

  it('shows the save error when field values fail to save', async () => {
    mockSaveAll.mockResolvedValueOnce({ error: 'boom' })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('boom')).toBeInTheDocument()
  })
})
