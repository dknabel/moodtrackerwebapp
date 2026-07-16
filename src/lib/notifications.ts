import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export interface ScheduledReminder {
  id: string
  time: string    // 'HH:MM'
  title: string
  body: string
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export async function requestNotificationPermission(): Promise<boolean> {
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

export async function syncScheduledNotifications(reminders: ScheduledReminder[]): Promise<void> {
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications })
  }

  if (reminders.length === 0) return

  await LocalNotifications.schedule({
    notifications: reminders.map((reminder, index) => {
      const [hour, minute] = reminder.time.split(':').map(Number)
      return {
        id: index + 1,
        title: reminder.title,
        body: reminder.body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      }
    }),
  })
}
