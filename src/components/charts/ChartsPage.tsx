import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { useTheme } from '../../hooks/useTheme'
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
  const { fromDate, toDate } = useMemo(() => ({
    toDate: format(new Date(), 'yyyy-MM-dd'),
    fromDate: format(subDays(new Date(), rangeDays), 'yyyy-MM-dd'),
  }), [rangeDays])
  const { logs, loading } = useLogs(fromDate, toDate)
  // useLogs returns newest-first (for History). Charts need oldest-first for left-to-right time axis.
  const chronologicalLogs = useMemo(() => [...logs].reverse(), [logs])
  const { isDark } = useTheme()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Charts</h1>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center text-gray-400 dark:text-gray-500 mt-8">Loading…</div>}

      {!loading && logs.length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500 mt-8">
          No entries for this period.
        </div>
      )}

      {!loading && chronologicalLogs.length > 0 && (
        <>
          <MoodChart logs={chronologicalLogs} isDark={isDark} />
          <SleepChart logs={chronologicalLogs} isDark={isDark} />
          <MealsChart logs={chronologicalLogs} isDark={isDark} />
          <ExerciseChart logs={chronologicalLogs} isDark={isDark} />
        </>
      )}
    </div>
  )
}
