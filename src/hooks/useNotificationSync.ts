// src/hooks/useNotificationSync.ts
import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { supabase } from '../lib/supabase'
import type { Reminder, Medication } from '../lib/database.types'
import { isNativePlatform, syncScheduledNotifications, type ScheduledReminder } from '../lib/notifications'

export function buildScheduledReminders(reminders: Reminder[], medications: Medication[]): ScheduledReminder[] {
  return reminders
    .filter(reminder => reminder.enabled)
    .flatMap(reminder => {
      if (reminder.kind === 'medication') {
        const medication = medications.find(m => m.id === reminder.medication_id)
        if (!medication) return []
        return [{
          id: reminder.id,
          time: reminder.time,
          title: 'Medication reminder',
          body: `Time to take ${medication.name}`,
        }]
      }
      return [{
        id: reminder.id,
        time: reminder.time,
        title: reminder.label || 'Daily check-in',
        body: "Time to log today's mood",
      }]
    })
}

async function reconcile(): Promise<void> {
  const [{ data: reminders }, { data: medications }] = await Promise.all([
    supabase.from('reminders').select('*'),
    supabase.from('medications').select('*').eq('active', true),
  ])
  await syncScheduledNotifications(buildScheduledReminders(reminders ?? [], medications ?? []))
}

export function useNotificationSync(): void {
  useEffect(() => {
    if (!isNativePlatform()) return

    void reconcile()

    let listener: { remove: () => void } | null = null
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      void reconcile()
    }).then(handle => {
      listener = handle
    })
    return () => { listener?.remove() }
  }, [])
}
