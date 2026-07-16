import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useReminders } from '../../hooks/useReminders'
import { useMedications } from '../../hooks/useMedications'
import { isNativePlatform, requestNotificationPermission } from '../../lib/notifications'
import { focusRing } from '../../lib/styles'

export function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useReminders()
  const { medications } = useMedications()
  const [newTime, setNewTime] = useState('21:00')
  const [newLabel, setNewLabel] = useState('')
  const native = isNativePlatform()

  const dailyReminders = reminders.filter(r => r.kind === 'daily_log')

  const enableReminder = async (existing: typeof reminders[number] | undefined, time: string, medicationId: string | null) => {
    const granted = await requestNotificationPermission()
    if (!granted) return
    if (existing) {
      await updateReminder(existing.id, { enabled: true })
    } else {
      await addReminder({ kind: medicationId ? 'medication' : 'daily_log', medication_id: medicationId, time, label: null })
    }
  }

  const disableReminder = async (id: string) => {
    await updateReminder(id, { enabled: false })
  }

  const handleAddDailyReminder = async () => {
    if (!newTime) return
    const granted = await requestNotificationPermission()
    if (!granted) return
    await addReminder({ kind: 'daily_log', medication_id: null, time: newTime, label: newLabel || null })
    setNewLabel('')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reminders</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Daily check-ins</h2>
        {dailyReminders.map(reminder => (
          <div key={reminder.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="time"
              aria-label={`${reminder.label ?? 'Daily reminder'} time`}
              value={reminder.time}
              onChange={e => void updateReminder(reminder.id, { time: e.target.value })}
              className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              aria-label={`${reminder.label ?? 'Daily reminder'} label`}
              value={reminder.label ?? ''}
              placeholder="Label"
              onChange={e => void updateReminder(reminder.id, { label: e.target.value || null })}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                aria-label={reminder.enabled ? `Disable ${reminder.label ?? 'reminder'}` : `Enable ${reminder.label ?? 'reminder'}`}
                checked={reminder.enabled}
                disabled={!native}
                onChange={e => void (e.target.checked ? enableReminder(reminder, reminder.time, null) : disableReminder(reminder.id))}
                className="w-5 h-5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>
            <button
              type="button"
              aria-label={`Delete ${reminder.label ?? 'reminder'} reminder`}
              onClick={() => void deleteReminder(reminder.id)}
              className={`p-2 -m-1 text-red-500 dark:text-red-400 rounded-lg ${focusRing}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-3 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <input
            type="time"
            aria-label="New reminder time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <input
            type="text"
            aria-label="New reminder label"
            value={newLabel}
            placeholder="Label (optional)"
            onChange={e => setNewLabel(e.target.value)}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={() => void handleAddDailyReminder()}
            className={`bg-blue-600 text-white rounded p-2 text-sm font-medium ${focusRing}`}
          >
            Add reminder
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Medications</h2>
        {medications.map(med => {
          const existing = reminders.find(r => r.kind === 'medication' && r.medication_id === med.id)
          const time = existing?.time ?? med.scheduled_time ?? '08:00'
          return (
            <div key={med.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{med.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{med.dose}</p>
              </div>
              <input
                type="time"
                aria-label={`${med.name} reminder time`}
                value={time}
                disabled={!existing}
                onChange={e => existing && void updateReminder(existing.id, { time: e.target.value })}
                className="border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={`Remind me for ${med.name}`}
                  checked={existing?.enabled ?? false}
                  disabled={!native}
                  onChange={e => void (e.target.checked ? enableReminder(existing, time, med.id) : existing && disableReminder(existing.id))}
                  className="w-5 h-5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                />
              </label>
            </div>
          )
        })}
      </section>

      {!native && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Notification scheduling is only available in the iOS/Android app.
        </p>
      )}
    </div>
  )
}
