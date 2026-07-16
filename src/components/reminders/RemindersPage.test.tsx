import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RemindersPage } from './RemindersPage'
import type { Reminder, Medication } from '../../lib/database.types'

const dailyReminder: Reminder = {
  id: 'r1', user_id: 'u1', kind: 'daily_log', medication_id: null,
  time: '21:00', label: 'Evening check-in', enabled: true, created_at: '',
}
const med: Medication = {
  id: 'm1', user_id: 'u1', name: 'Lithium', dose: '300mg',
  scheduled_time: '08:00', active: true, created_at: '',
}
const medReminder: Reminder = {
  id: 'r2', user_id: 'u1', kind: 'medication', medication_id: 'm1',
  time: '08:00', label: null, enabled: true, created_at: '',
}

const mockAddReminder = vi.fn().mockResolvedValue(null)
const mockUpdateReminder = vi.fn().mockResolvedValue(null)
const mockDeleteReminder = vi.fn().mockResolvedValue(null)
let remindersState: Reminder[]

vi.mock('../../hooks/useReminders', () => ({
  useReminders: () => ({
    reminders: remindersState,
    addReminder: mockAddReminder,
    updateReminder: mockUpdateReminder,
    deleteReminder: mockDeleteReminder,
  }),
}))
vi.mock('../../hooks/useMedications', () => ({
  useMedications: () => ({ medications: [med] }),
}))

const mockIsNativePlatform = vi.fn(() => true)
const mockRequestPermission = vi.fn().mockResolvedValue(true)
vi.mock('../../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
  requestNotificationPermission: () => mockRequestPermission(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
  mockRequestPermission.mockResolvedValue(true)
  remindersState = [dailyReminder]
})

describe('RemindersPage', () => {
  it('lists existing daily log reminders', () => {
    render(<RemindersPage />)
    expect(screen.getByDisplayValue('Evening check-in')).toBeInTheDocument()
  })

  it('lists every active medication with a reminder row', () => {
    render(<RemindersPage />)
    expect(screen.getByText('Lithium')).toBeInTheDocument()
  })

  it('adds a daily log reminder when the add form is submitted', async () => {
    render(<RemindersPage />)
    fireEvent.change(screen.getByLabelText('New reminder time'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('New reminder label'), { target: { value: 'Morning check-in' } })
    fireEvent.click(screen.getByText('Add reminder'))

    await waitFor(() => expect(mockAddReminder).toHaveBeenCalledWith({
      kind: 'daily_log', medication_id: null, time: '09:00', label: 'Morning check-in',
    }))
  })

  it('deletes a daily log reminder', async () => {
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Delete Evening check-in reminder'))
    await waitFor(() => expect(mockDeleteReminder).toHaveBeenCalledWith('r1'))
  })

  it('creates a medication reminder pre-filled from scheduled_time when its toggle is turned on', async () => {
    remindersState = []
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Remind me for Lithium'))

    await waitFor(() => expect(mockAddReminder).toHaveBeenCalledWith({
      kind: 'medication', medication_id: 'm1', time: '08:00', label: null,
    }))
  })

  it('toggles an existing medication reminder off', async () => {
    remindersState = [medReminder]
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Remind me for Lithium'))
    await waitFor(() => expect(mockUpdateReminder).toHaveBeenCalledWith('r2', { enabled: false }))
  })

  it('requests notification permission before enabling a reminder, and does not add it if denied', async () => {
    remindersState = []
    mockRequestPermission.mockResolvedValue(false)
    render(<RemindersPage />)
    fireEvent.click(screen.getByLabelText('Remind me for Lithium'))

    await waitFor(() => expect(mockRequestPermission).toHaveBeenCalled())
    expect(mockAddReminder).not.toHaveBeenCalled()
  })

  it('disables notification toggles on web (non-native)', () => {
    mockIsNativePlatform.mockReturnValue(false)
    render(<RemindersPage />)
    expect(screen.getByLabelText('Remind me for Lithium')).toBeDisabled()
  })
})
