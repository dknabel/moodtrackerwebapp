import { format, subDays } from 'date-fns'

export interface AdherenceDay {
  date: string
  taken: boolean | null
}

interface MedLogLike {
  date: string
  medication_id: string
  taken: boolean
}

export function buildAdherenceDays(
  logs: MedLogLike[],
  medicationId: string,
  days: number,
  today: Date = new Date(),
): AdherenceDay[] {
  const byDate = new Map<string, boolean>()
  for (const l of logs) {
    if (l.medication_id === medicationId) byDate.set(l.date, l.taken)
  }
  const result: AdherenceDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(today, i), 'yyyy-MM-dd')
    result.push({ date, taken: byDate.get(date) ?? null })
  }
  return result
}
