import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TodayPage } from './TodayPage'
import * as useDailyLogModule from '../../hooks/useDailyLog'

vi.mock('../../hooks/useDailyLog')

const mockSave = vi.fn().mockResolvedValue({ error: null })

function emptyLog(date: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'x', user_id: 'u1', date,
    mood_rating: null, mood_energy: null, mood_anxiety: null,
    meals_count: null, exercised: null,
    sleep_hours: null, sleep_quality: null,
    bedtime: null, wake_time: null, tonight_bedtime: null,
    gratitude: null, created_at: '', updated_at: '',
    ...overrides,
  }
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
      if (date === '2026-06-22') {
        return { log: null, loading: false, error: null, save: mockSave }
      }
      if (date === '2026-06-21') {
        return {
          log: emptyLog('2026-06-21', { tonight_bedtime: '23:00:00' }),
          loading: false, error: null, save: vi.fn(),
        }
      }
      return { log: null, loading: false, error: null, save: vi.fn() }
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
      if (date === '2026-06-22') {
        return {
          log: emptyLog('2026-06-22', { bedtime: '22:30:00' }),
          loading: false, error: null, save: mockSave,
        }
      }
      if (date === '2026-06-21') {
        return {
          log: emptyLog('2026-06-21', { tonight_bedtime: '23:00:00' }),
          loading: false, error: null, save: vi.fn(),
        }
      }
      return { log: null, loading: false, error: null, save: vi.fn() }
    })
    renderPage('2026-06-22')
    await waitFor(() => {
      expect(screen.getByLabelText('Bedtime')).toHaveValue('22:30')
    })
  })
})
