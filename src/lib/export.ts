import type { DailyLog, Medication, MedicationLog } from './database.types'

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function buildCsvRows(
  logs: DailyLog[],
  medications: Medication[],
  medicationLogs: MedicationLog[]
): string {
  const medLogKey = (date: string, medId: string) => `${date}::${medId}`
  const takenMap = new Map<string, boolean>()
  for (const ml of medicationLogs) {
    takenMap.set(medLogKey(ml.date, ml.medication_id), ml.taken)
  }

  const medHeaders = medications.map(m => `${m.name} (${m.dose})`)
  const headers = [
    'date', 'mood_rating', 'mood_energy', 'mood_anxiety', 'meals_count',
    ...medHeaders,
    'exercised', 'sleep_hours', 'sleep_quality', 'bedtime', 'wake_time',
    'tonight_bedtime', 'gratitude',
  ]

  const rows = logs.map(log => {
    const medValues = medications.map(m => {
      const taken = takenMap.get(medLogKey(log.date, m.id))
      return taken === true ? 'yes' : taken === false ? 'no' : ''
    })
    return [
      log.date,
      log.mood_rating,
      log.mood_energy,
      log.mood_anxiety,
      log.meals_count,
      ...medValues,
      log.exercised == null ? '' : log.exercised ? 'yes' : 'no',
      log.sleep_hours,
      log.sleep_quality,
      log.bedtime,
      log.wake_time,
      log.tonight_bedtime,
      log.gratitude,
    ].map(escapeCsv).join(',')
  })

  return [headers.map(escapeCsv).join(','), ...rows].join('\n')
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(
  logs: DailyLog[],
  medications: Medication[],
  medicationLogs: MedicationLog[],
  dateRange: string,
  filename: string
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Mood Tracker', 14, 16)
  doc.setFontSize(10)
  doc.text(dateRange, 14, 24)

  const takenMap = new Map<string, boolean>()
  for (const ml of medicationLogs) {
    takenMap.set(`${ml.date}::${ml.medication_id}`, ml.taken)
  }

  const medHeaders = medications.map(m => `${m.name} (${m.dose})`)
  const head = [[
    'Date', 'Mood', 'Energy', 'Anxiety', 'Meals',
    ...medHeaders,
    'Exercised', 'Sleep h', 'Sleep Q', 'Bedtime', 'Wake', 'Tonight bed', 'Gratitude',
  ]]

  const body = logs.map(log => [
    log.date,
    log.mood_rating ?? '',
    log.mood_energy ?? '',
    log.mood_anxiety ?? '',
    log.meals_count ?? '',
    ...medications.map(m => {
      const taken = takenMap.get(`${log.date}::${m.id}`)
      return taken === true ? 'Y' : taken === false ? 'N' : ''
    }),
    log.exercised == null ? '' : log.exercised ? 'Y' : 'N',
    log.sleep_hours ?? '',
    log.sleep_quality ?? '',
    log.bedtime?.slice(0, 5) ?? '',
    log.wake_time?.slice(0, 5) ?? '',
    log.tonight_bedtime?.slice(0, 5) ?? '',
    log.gratitude ?? '',
  ])

  autoTable(doc, { head, body, startY: 30, styles: { fontSize: 7 } })
  doc.save(filename)
}
