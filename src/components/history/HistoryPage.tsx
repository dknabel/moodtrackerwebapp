import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { supabase } from '../../lib/supabase'
import { buildCsvRows, downloadCsv, downloadPdf } from '../../lib/export'
import { HistoryEntry } from './HistoryEntry'

type ExportRange = '30' | '90' | 'all'
type ExportFormat = 'csv' | 'pdf'

export function HistoryPage() {
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'), [])
  const { logs, loading, error } = useLogs(fromDate, toDate)

  const [showExport, setShowExport] = useState(false)
  const [exportRange, setExportRange] = useState<ExportRange>('90')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    const today = format(new Date(), 'yyyy-MM-dd')
    const from =
      exportRange === 'all'
        ? '2020-01-01'
        : format(subDays(new Date(), exportRange === '30' ? 30 : 90), 'yyyy-MM-dd')

    const [{ data: exportLogs }, { data: medications }, { data: medLogs }] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('*')
        .gte('date', from)
        .lte('date', today)
        .order('date', { ascending: false }),
      supabase
        .from('medications')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('medication_logs')
        .select('*')
        .gte('date', from)
        .lte('date', today),
    ])

    const rangeLabel =
      exportRange === 'all' ? 'All time' : `Last ${exportRange} days`
    const filename = `mood-tracker-${format(new Date(), 'yyyy-MM-dd')}`

    if (exportFormat === 'csv') {
      const content = buildCsvRows(exportLogs ?? [], medications ?? [], medLogs ?? [])
      downloadCsv(content, `${filename}.csv`)
    } else {
      await downloadPdf(exportLogs ?? [], medications ?? [], medLogs ?? [], rangeLabel, `${filename}.pdf`)
    }

    setExporting(false)
    setShowExport(false)
  }

  if (loading) {
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
  }

  if (error) {
    return <div className="text-center text-red-500 mt-12">{error}</div>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">History</h1>
        <button
          onClick={() => setShowExport(v => !v)}
          className="text-sm text-blue-600 font-medium"
        >
          Export
        </button>
      </div>

      {showExport && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date range</p>
            <div className="flex gap-2">
              {(['30', '90', 'all'] as ExportRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setExportRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-medium border ${
                    exportRange === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {r === 'all' ? 'All time' : `Last ${r} days`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Format</p>
            <div className="flex gap-2">
              {(['csv', 'pdf'] as ExportFormat[]).map(f => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={`px-3 py-1 rounded-md text-xs font-medium border uppercase ${
                    exportFormat === f
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-blue-600 text-white rounded-lg p-2 text-sm font-medium disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Download'}
          </button>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center text-gray-400 dark:text-gray-500 mt-12">
          <p>No entries yet.</p>
          <p className="text-sm mt-1">Log your first day on the Today tab.</p>
        </div>
      ) : (
        logs.map(log => <HistoryEntry key={log.id} log={log} />)
      )}
    </div>
  )
}
