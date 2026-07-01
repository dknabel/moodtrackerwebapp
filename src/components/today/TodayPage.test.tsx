import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { format } from 'date-fns'
import { TodayPage } from './TodayPage'

vi.mock('../../hooks/useDailyLog', () => ({
  useDailyLog: vi.fn(() => ({ log: null, loading: false, error: null, save: vi.fn() })),
}))
vi.mock('../../hooks/useMedications', () => ({
  useMedications: vi.fn(() => ({
    medications: [], loading: false,
    addMedication: vi.fn(), updateMedication: vi.fn(), deactivateMedication: vi.fn(),
  })),
}))
vi.mock('../../hooks/useMedicationLogs', () => ({
  useMedicationLogs: vi.fn(() => ({ logs: [], loading: false, setTaken: vi.fn() })),
}))

beforeEach(() => vi.clearAllMocks())

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/log/:date" element={<TodayPage />} />
      </Routes>
    </MemoryRouter>
  )

describe('TodayPage date param validation', () => {
  it('redirects to home instead of crashing on a malformed date', () => {
    renderAt('/log/not-a-date')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('redirects to home on an impossible calendar date', () => {
    renderAt('/log/2026-13-99')
    expect(screen.getByText('HOME')).toBeInTheDocument()
  })

  it('renders the page for a valid date', () => {
    renderAt('/log/2026-06-15')
    expect(screen.getByRole('heading', { name: '2026-06-15' })).toBeInTheDocument()
  })

  it('shows "Today" for the current date', () => {
    renderAt(`/log/${format(new Date(), 'yyyy-MM-dd')}`)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })
})
