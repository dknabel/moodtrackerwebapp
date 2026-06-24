import { useMemo } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import type { DailyLog, MedicationLog, Medication } from '../lib/database.types'

interface StreakResult {
  current: number
  longest: number
}

function computeStreak(dateSet: Set<string>): StreakResult {
  const today = format(new Date(), 'yyyy-MM-dd')

  let current = 0
  let cursor = today
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
  medicationLogs: MedicationLog[],
  medications: Medication[]
): { logging: StreakResult; exercise: StreakResult; meds: StreakResult } {
  return useMemo(() => {
    const loggingDates = new Set(logs.map(l => l.date))
    const exerciseDates = new Set(logs.filter(l => l.exercised === true).map(l => l.date))

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
      exercise: computeStreak(exerciseDates),
      meds: medIds.length === 0 ? { current: 0, longest: 0 } : computeStreak(medsDates),
    }
  }, [logs, medicationLogs, medications])
}
