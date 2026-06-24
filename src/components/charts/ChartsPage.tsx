import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { useMedications } from '../../hooks/useMedications'
import { useMedicationLogsBulk } from '../../hooks/useMedicationLogsBulk'
import { useTheme } from '../../hooks/useTheme'
import { useStreaks } from '../../hooks/useStreaks'
import { MoodChart } from './MoodChart'
import { SleepChart } from './SleepChart'
import { MealsChart } from './MealsChart'
import { ExerciseChart } from './ExerciseChart'
import { StatsSection } from './StatsSection'
import { CorrelationsSection } from './CorrelationsSection'

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export function ChartsPage() {
  const [rangeDays, setRangeDays] = useState(30)
  const { fromDate, toDate, from365 } = useMemo(() => {
    const now = new Date()
    return {
      toDate: format(now, 'yyyy-MM-dd'),
      fromDate: format(subDays(now, rangeDays), 'yyyy-MM-dd'),
      from365: format(subDays(now, 365), 'yyyy-MM-dd'),
    }
  }, [rangeDays])

  const { logs, loading } = useLogs(fromDate, toDate)
  const { logs: logs365 } = useLogs(from365, toDate)
  const { medications } = useMedications()
  const { logs: medLogs365 } = useMedicationLogsBulk(from365, toDate)
  const chronologicalLogs = useMemo(() => [...logs].reverse(), [logs])
  const { isDark } = useTheme()
  const streaks = useStreaks(logs365, medLogs365, medications)

  return (
    <div className="flex flex-col gap-6">
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

      <StatsSection {...streaks} />

      {chronologicalLogs.length > 0 && (
        <CorrelationsSection logs={chronologicalLogs} isDark={isDark} />
      )}
    </div>
  )
}
