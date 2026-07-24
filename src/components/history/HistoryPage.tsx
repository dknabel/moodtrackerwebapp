import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { useFields } from '../../hooks/useFields'
import { useFieldValuesBulk } from '../../hooks/useFieldValuesBulk'
import { buildCsvRows, downloadCsv, downloadPdf } from '../../lib/export'
import { fetchExportData, type ExportRange } from '../../lib/exportData'
import { btnPrimary, linkText } from '../../lib/styles'
import { Skeleton } from '../ui/Skeleton'
import { HistoryEntry } from './HistoryEntry'
import type { HistoryItem } from './HistoryEntry'

type ExportFormat = 'csv' | 'pdf'

export function HistoryPage() {
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'), [])
  const { logs, loading, error } = useLogs(fromDate, toDate)
  const { fields, loading: fieldsLoading, error: fieldsError } = useFields()
  const { values, loading: valuesLoading, error: valuesError } = useFieldValuesBulk(fromDate, toDate)

  const days = useMemo(() => {
    const logByDate = new Map(logs.map(l => [l.date, l]))
    const itemsByDate = new Map<string, HistoryItem[]>()
    const fieldById = new Map(fields.map(f => [f.id, f]))
    for (const v of values) {
      const field = fieldById.get(v.field_id)
      if (!field) continue
      const list = itemsByDate.get(v.date) ?? []
      list.push({ field, value: v.value })
      itemsByDate.set(v.date, list)
    }
    const dates = Array.from(new Set([...logByDate.keys(), ...itemsByDate.keys()]))
      .sort((a, b) => b.localeCompare(a))
    return dates.map(date => ({
      date,
      sleepHours: logByDate.get(date)?.sleep_hours ?? null,
      items: (itemsByDate.get(date) ?? []).sort((a, b) => a.field.sort_order - b.field.sort_order),
    }))
  }, [logs, fields, values])

  const [showExport, setShowExport] = useState(false)
  const [exportRange, setExportRange] = useState<ExportRange>('90')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const exportData = await fetchExportData(exportRange)

      const rangeLabel =
        exportRange === 'all' ? 'All time' : `Last ${exportRange} days`
      const filename = `mood-tracker-${format(new Date(), 'yyyy-MM-dd')}`

      if (exportFormat === 'csv') {
        await downloadCsv(buildCsvRows(exportData), `${filename}.csv`)
      } else {
        await downloadPdf(exportData, rangeLabel, `${filename}.pdf`)
      }

      setShowExport(false)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading || fieldsLoading || valuesLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  const loadError = error ?? fieldsError ?? valuesError
  if (loadError) {
    return <div className="text-center text-danger mt-12">{loadError}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl tracking-[-0.025em] text-ink">Journal</h1>
        <button
          onClick={() => setShowExport(v => !v)}
          className={`text-sm ${linkText}`}
        >
          Export
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {showExport && (
          <div className="bg-surface border border-line rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Date range</p>
              <div className="flex gap-2">
                {(['30', '90', 'all'] as ExportRange[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setExportRange(r)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border ${
                      exportRange === r
                        ? 'bg-clay text-white border-clay'
                        : 'border-line text-ink'
                    }`}
                  >
                    {r === 'all' ? 'All time' : `Last ${r} days`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Format</p>
              <div className="flex gap-2">
                {(['csv', 'pdf'] as ExportFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setExportFormat(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium border uppercase ${
                      exportFormat === f
                        ? 'bg-clay text-white border-clay'
                        : 'border-line text-ink'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {exportError && (
              <p className="text-danger text-xs">Export failed: {exportError}</p>
            )}
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`w-full ${btnPrimary}`}
            >
              {exporting ? 'Exporting…' : 'Download'}
            </button>
          </div>
        )}

        {days.length === 0 ? (
          <div className="text-center text-faint mt-12">
            <p className="font-serif text-lg text-muted">Nothing logged <em className="italic text-clay">yet</em>.</p>
            <p className="text-sm mt-1">Log your first day on the Today tab.</p>
          </div>
        ) : (
          days.map(day => <HistoryEntry key={day.date} {...day} />)
        )}
      </div>
    </div>
  )
}
