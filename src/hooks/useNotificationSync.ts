import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { Reminder, Medication } from '../lib/database.types'
import { isNativePlatform, syncScheduledNotifications, type ScheduledReminder } from '../lib/notifications'
import { useReminders } from './useReminders'
import { useMedications } from './useMedications'

export function buildScheduledReminders(reminders: Reminder[], medications: Medication[]): ScheduledReminder[] {
  return reminders
    .filter(reminder => reminder.enabled)
    .map(reminder => {
      if (reminder.kind === 'medication') {
        const medication = medications.find(m => m.id === reminder.medication_id)
        return {
          id: reminder.id,
          time: reminder.time,
          title: 'Medication reminder',
          body: medication ? `Time to take ${medication.name}` : 'Time to take your medication',
        }
      }
      return {
        id: reminder.id,
        time: reminder.time,
        title: reminder.label || 'Daily check-in',
        body: "Time to log today's mood",
      }
    })
}

export function useNotificationSync(): void {
  const { reminders } = useReminders()
  const { medications } = useMedications()

  useEffect(() => {
    if (!isNativePlatform()) return
    void syncScheduledNotifications(buildScheduledReminders(reminders, medications))
  }, [reminders, medications])

  useEffect(() => {
    if (!isNativePlatform()) return
    let listener: { remove: () => void } | null = null
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      void syncScheduledNotifications(buildScheduledReminders(reminders, medications))
    }).then(handle => {
      listener = handle
    })
    return () => { listener?.remove() }
  }, [reminders, medications])
}
