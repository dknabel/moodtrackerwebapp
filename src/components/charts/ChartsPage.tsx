import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { MoodChart } from './MoodChart'
import { SleepChart } from './SleepChart'
import { MealsChart } from './MealsChart'
import { ExerciseChart } from './ExerciseChart'

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function ChartsPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const toDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const fromDate = useMemo(
    () => format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
    [rangeDays]
  )
  const { logs, loading } = useLogs(fromDate, toDate)
  // useLogs returns newest-first (for History). Charts need oldest-first for left-to-right time axis.
  const chronologicalLogs = useMemo(() => [...logs].reverse(), [logs])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Charts</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-400 mt-8">Loading…</div>}

      {!loading && logs.length === 0 && (
        <div className="text-center text-gray-400 mt-8">
          No entries for this period.
        </div>
      )}

      {!loading && chronologicalLogs.length > 0 && (
        <>
          <MoodChart logs={chronologicalLogs} />
          <SleepChart logs={chronologicalLogs} />
          <MealsChart logs={chronologicalLogs} />
          <ExerciseChart logs={chronologicalLogs} />
        </>
      )}
    </div>
  )
}
