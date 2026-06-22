import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HistoryEntry } from './HistoryEntry'
import type { DailyLog } from '../../lib/database.types'

const baseLog: DailyLog = {
  id: '1',
  user_id: 'u1',
  date: '2026-06-21',
  mood_rating: 7,
  mood_energy: 6,
  mood_anxiety: 4,
  meals_count: 3,
  exercised: true,
  sleep_hours: 7.5,
  sleep_quality: 4,
  bedtime: null,
  wake_time: null,
  tonight_bedtime: null,
  gratitude: null,
  created_at: '',
  updated_at: '',
}

function renderEntry(log: DailyLog) {
  return render(
    <MemoryRouter>
      <HistoryEntry log={log} />
    </MemoryRouter>
  )
}

describe('HistoryEntry', () => {
  it('shows no gratitude preview when null', () => {
    renderEntry(baseLog)
    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
  })

  it('shows no gratitude preview when empty string', () => {
    renderEntry({ ...baseLog, gratitude: '' })
    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument()
  })

  it('shows the full note when 80 chars or fewer', () => {
    renderEntry({ ...baseLog, gratitude: 'Sunny weather' })
    expect(screen.getByText('"Sunny weather"')).toBeInTheDocument()
  })

  it('truncates notes longer than 80 chars', () => {
    const long = 'A'.repeat(90)
    renderEntry({ ...baseLog, gratitude: long })
    expect(screen.getByText(`"${'A'.repeat(80)}…"`)).toBeInTheDocument()
  })
})
