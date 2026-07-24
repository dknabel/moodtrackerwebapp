import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { ExportData } from './exportData'
import { displayValue } from './fields'

function escapeCsv(value: unknown): string {
  if (value == null) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

interface ExportRow {
  date: string
  fieldCells: string[]
  medCells: string[]
  sleepCells: (string | number | null)[]
}

function buildRows(data: ExportData): ExportRow[] {
  const { logs, medications, medLogs, fields, fieldValues } = data

  const takenMap = new Map<string, boolean>()
  for (const ml of medLogs) takenMap.set(`${ml.date}::${ml.medication_id}`, ml.taken)

  const valueMap = new Map<string, string>()
  const fieldById = new Map(fields.map(f => [f.id, f]))
  for (const v of fieldValues) {
    const field = fieldById.get(v.field_id)
    if (field) valueMap.set(`${v.date}::${v.field_id}`, displayValue(field, v.value))
  }

  const logByDate = new Map(logs.map(l => [l.date, l]))
  const dates = Array.from(
    new Set([...logs.map(l => l.date), ...fieldValues.map(v => v.date)])
  ).sort((a, b) => b.localeCompare(a))

  return dates.map(date => {
    const log = logByDate.get(date)
    return {
      date,
      fieldCells: fields.map(f => valueMap.get(`${date}::${f.id}`) ?? ''),
      medCells: medications.map(m => {
        const taken = takenMap.get(`${date}::${m.id}`)
        return taken === true ? 'yes' : taken === false ? 'no' : ''
      }),
      sleepCells: [
        log?.sleep_hours ?? null,
        log?.sleep_quality ?? null,
        log?.bedtime ?? null,
        log?.wake_time ?? null,
        log?.tonight_bedtime ?? null,
      ],
    }
  })
}

const SLEEP_HEADERS = ['sleep_hours', 'sleep_quality', 'bedtime', 'wake_time', 'tonight_bedtime']

export function buildCsvRows(data: ExportData): string {
  const headers = [
    'date',
    ...data.fields.map(f => f.name),
    ...data.medications.map(m => `${m.name} (${m.dose})`),
    ...SLEEP_HEADERS,
  ]
  const rows = buildRows(data).map(r =>
    [r.date, ...r.fieldCells, ...r.medCells, ...r.sleepCells].map(escapeCsv).join(',')
  )
  return [headers.map(escapeCsv).join(','), ...rows].join('\n')
}

// WKWebView (the native iOS shell) doesn't support `<a download>` blob links,
// so on native platforms we write the file to disk and hand it to the share sheet instead.
async function saveAndShare(filename: string, base64Data: string): Promise<void> {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  })
  await Share.share({ url: uri })
}

export async function downloadCsv(content: string, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const base64 = btoa(unescape(encodeURIComponent(content)))
    await saveAndShare(filename, base64)
    return
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(
  data: ExportData,
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

  const head = [[
    'Date',
    ...data.fields.map(f => f.name),
    ...data.medications.map(m => `${m.name} (${m.dose})`),
    'Sleep h', 'Sleep Q', 'Bedtime', 'Wake', 'Tonight bed',
  ]]

  const body = buildRows(data).map(r => [
    r.date,
    ...r.fieldCells,
    ...r.medCells.map(c => (c === 'yes' ? 'Y' : c === 'no' ? 'N' : '')),
    r.sleepCells[0] ?? '',
    r.sleepCells[1] ?? '',
    typeof r.sleepCells[2] === 'string' ? r.sleepCells[2].slice(0, 5) : '',
    typeof r.sleepCells[3] === 'string' ? r.sleepCells[3].slice(0, 5) : '',
    typeof r.sleepCells[4] === 'string' ? r.sleepCells[4].slice(0, 5) : '',
  ])

  autoTable(doc, { head, body, startY: 30, styles: { fontSize: 7 } })

  if (Capacitor.isNativePlatform()) {
    const dataUri = doc.output('datauristring')
    const base64 = dataUri.slice(dataUri.indexOf(',') + 1)
    await saveAndShare(filename, base64)
    return
  }
  doc.save(filename)
}
