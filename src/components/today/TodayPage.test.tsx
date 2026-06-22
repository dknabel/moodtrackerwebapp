import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TodayPage } from './TodayPage'
import * as useDailyLogModule from '../../hooks/useDailyLog'

vi.mock('../../hooks/useDailyLog')

const mockSave = vi.fn().mockResolvedValue({ error: null })

// Stable object references — must not be created inside the mock factory.
// The useEffect in TodayPage depends on `yesterdayLog` by reference; creating
// a new object on every render causes an infinite re-render loop.
const noLog = { log: null, loading: false, error: null, save: mockSave }
const yesterdayWithBedtime = {
  log: {
    id: 'y1', user_id: 'u1', date: '2026-06-21',
    mood_rating: null, mood_energy: null, mood_anxiety: null,
    meals_count: null, exercised: null,
    sleep_hours: null, sleep_quality: null,
    bedtime: null, wake_time: null, tonight_bedtime: '23:00:00',
    gratitude: null, created_at: '', updated_at: '',
  },
  loading: false, error: null, save: vi.fn(),
}
const todayWithBedtime = {
  log: {
    id: 't1', user_id: 'u1', date: '2026-06-22',
    mood_rating: null, mood_energy: null, mood_anxiety: null,
    meals_count: null, exercised: null,
    sleep_hours: null, sleep_quality: null,
    bedtime: '22:30:00', wake_time: null, tonight_bedtime: null,
    gratitude: null, created_at: '', updated_at: '',
  },
  loading: false, error: null, save: mockSave,
}

function renderPage(date = '2026-06-22') {
  render(
    <MemoryRouter initialEntries={[`/log/${date}`]}>
      <Routes>
        <Route path="/log/:date" element={<TodayPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TodayPage auto-populate bedtime', () => {
  beforeEach(() => {
    vi.mocked(useDailyLogModule.useDailyLog).mockImplementation((date: string) => {
      if (date === '2026-06-22') return noLog
      if (date === '2026-06-21') return yesterdayWithBedtime
      return noLog
    })
  })

  it('pre-fills last-night bedtime from yesterday tonight_bedtime when today log has no bedtime', async () => {
    renderPage('2026-06-22')
    await waitFor(() => {
      expect(screen.getByLabelText('Bedtime')).toHaveValue('23:00')
    })
  })

  it('does not overwrite bedtime when today log already has one', async () => {
    vi.mocked(useDailyLogModule.useDailyLog).mockImplementation((date: string) => {
      if (date === '2026-06-22') return todayWithBedtime
      if (date === '2026-06-21') return yesterdayWithBedtime
      return noLog
    })
    renderPage('2026-06-22')
    await waitFor(() => {
      expect(screen.getByLabelText('Bedtime')).toHaveValue('22:30')
    })
  })
})
