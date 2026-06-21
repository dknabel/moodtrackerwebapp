import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { HistoryEntry } from './HistoryEntry'

export function HistoryPage() {
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'), [])
  const { logs, loading, error } = useLogs(fromDate, toDate)

  if (loading) {
    return <div className="text-center text-gray-400 mt-12">Loading…</div>
  }

  if (error) {
    return <div className="text-center text-red-500 mt-12">{error}</div>
  }

  if (logs.length === 0) {
    return (
      <div className="text-center text-gray-400 mt-12">
        <p>No entries yet.</p>
        <p className="text-sm mt-1">Log your first day on the Today tab.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-bold text-gray-900">History</h1>
      {logs.map(log => (
        <HistoryEntry key={log.id} log={log} />
      ))}
    </div>
  )
}
