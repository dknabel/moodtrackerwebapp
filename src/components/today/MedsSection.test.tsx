import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedsSection } from './MedsSection'

vi.mock('../../hooks/useMedications')
vi.mock('../../hooks/useMedicationLogs')

import { useMedications } from '../../hooks/useMedications'
import { useMedicationLogs } from '../../hooks/useMedicationLogs'

const mockUseMedications = vi.mocked(useMedications)
const mockUseMedicationLogs = vi.mocked(useMedicationLogs)
const mockSetTaken = vi.fn()

const med = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseMedications.mockReturnValue({
    medications: [],
    loading: false,
    error: null,
    addMedication: vi.fn(),
    updateMedication: vi.fn(),
    deactivateMedication: vi.fn(),
  })
  mockUseMedicationLogs.mockReturnValue({
    logs: [],
    loading: false,
    error: null,
    setTaken: mockSetTaken,
  })
})

describe('MedsSection', () => {
  it('shows empty state prompt when no medications configured', () => {
    render(<MedsSection date="2026-06-24" />)
    expect(screen.getByText(/No medications added/)).toBeInTheDocument()
  })

  it('renders medication name and dose', () => {
    mockUseMedications.mockReturnValue({
      medications: [med],
      loading: false,
    error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    render(<MedsSection date="2026-06-24" />)
    expect(screen.getByText(/Lithium/)).toBeInTheDocument()
    expect(screen.getByText(/300mg/)).toBeInTheDocument()
  })

  it('calls setTaken(id, true, null) when unchecked checkbox is toggled', async () => {
    mockUseMedications.mockReturnValue({
      medications: [med],
      loading: false,
    error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    render(<MedsSection date="2026-06-24" />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(mockSetTaken).toHaveBeenCalledWith('m1', true, null)
  })

  it('shows time input when medication is marked taken', () => {
    mockUseMedications.mockReturnValue({
      medications: [med],
      loading: false,
    error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    mockUseMedicationLogs.mockReturnValue({
      logs: [{ id: 'l1', user_id: 'u1', date: '2026-06-24', medication_id: 'm1', taken: true, taken_at: '08:00', created_at: '' }],
      loading: false,
    error: null,
      setTaken: mockSetTaken,
    })
    render(<MedsSection date="2026-06-24" />)
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument()
  })

  it('keeps the section heading visible while loading', () => {
    mockUseMedications.mockReturnValue({
      medications: [],
      loading: true,
      error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    render(<MedsSection date="2026-06-24" />)
    expect(screen.getByRole('heading', { name: 'Medications' })).toBeInTheDocument()
  })

  it('shows a fetch error instead of the empty state', () => {
    mockUseMedications.mockReturnValue({
      medications: [],
      loading: false,
      error: 'fetch broke',
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    render(<MedsSection date="2026-06-24" />)
    expect(screen.getByText(/fetch broke/)).toBeInTheDocument()
    expect(screen.queryByText(/No medications added/)).not.toBeInTheDocument()
  })

  it('shows an error when marking a medication taken fails', async () => {
    mockUseMedications.mockReturnValue({
      medications: [med],
      loading: false,
      error: null,
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deactivateMedication: vi.fn(),
    })
    mockSetTaken.mockResolvedValue('upsert failed')
    render(<MedsSection date="2026-06-24" />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(await screen.findByText(/upsert failed/)).toBeInTheDocument()
  })
})
