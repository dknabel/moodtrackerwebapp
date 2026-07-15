import { useMemo } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import type { CustomField, DailyLog, FieldValue, Medication, MedicationLog } from '../lib/database.types'

interface StreakResult {
  current: number
  longest: number
}

function computeStreak(dateSet: Set<string>): StreakResult {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  let current = 0
  // Today not being logged yet shouldn't read as a broken streak — count
  // from yesterday until today's entry exists.
  let cursor = dateSet.has(today) ? today : yesterday
  while (dateSet.has(cursor)) {
    current++
    cursor = format(subDays(parseISO(cursor), 1), 'yyyy-MM-dd')
  }

  const sorted = Array.from(dateSet).sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    const expected = i === 0
      ? sorted[0]
      : format(subDays(parseISO(sorted[i - 1]), -1), 'yyyy-MM-dd')
    run = sorted[i] === expected ? run + 1 : 1
    if (run > longest) longest = run
  }

  return { current, longest }
}

export function useStreaks(
  logs: DailyLog[],
  fields: CustomField[],
  fieldValues: FieldValue[],
  medicationLogs: MedicationLog[],
  medications: Medication[]
): { logging: StreakResult; meds: StreakResult; toggles: Array<{ name: string; streak: StreakResult }> } {
  return useMemo(() => {
    const loggingDates = new Set([
      ...logs.map(l => l.date),
      ...fieldValues.map(v => v.date),
    ])

    const toggles = fields
      .filter(f => f.active && f.type === 'toggle')
      .map(f => ({
        name: f.name,
        streak: computeStreak(
          new Set(fieldValues.filter(v => v.field_id === f.id && v.value === true).map(v => v.date))
        ),
      }))

    const medIds = medications.map(m => m.id)
    const medsDates = new Set<string>()
    if (medIds.length > 0) {
      const byDate = new Map<string, Map<string, boolean>>()
      for (const ml of medicationLogs) {
        if (!byDate.has(ml.date)) byDate.set(ml.date, new Map())
        byDate.get(ml.date)!.set(ml.medication_id, ml.taken)
      }
      for (const [date, dayMap] of byDate) {
        if (medIds.every(id => dayMap.get(id) === true)) medsDates.add(date)
      }
    }

    return {
      logging: computeStreak(loggingDates),
      toggles,
      meds: medIds.length === 0 ? { current: 0, longest: 0 } : computeStreak(medsDates),
    }
  }, [logs, fields, fieldValues, medicationLogs, medications])
}
