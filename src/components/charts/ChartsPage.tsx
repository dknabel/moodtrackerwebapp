import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { useLogs } from '../../hooks/useLogs'
import { useFields } from '../../hooks/useFields'
import { useFieldValuesBulk } from '../../hooks/useFieldValuesBulk'
import { useMedications } from '../../hooks/useMedications'
import { useMedicationLogsBulk } from '../../hooks/useMedicationLogsBulk'
import { useTheme } from '../../hooks/useTheme'
import { useStreaks } from '../../hooks/useStreaks'
import type { FieldValue } from '../../lib/database.types'
import { Skeleton } from '../ui/Skeleton'
import { SleepChart } from './SleepChart'
import { FieldChart } from './FieldChart'
import { OverlaySection } from './OverlaySection'
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

  // One fetch covers both the charts (sliced to the selected range) and streaks.
  const { logs: logs365, loading: logsLoading } = useLogs(from365, toDate)
  const { fields, activeFields, loading: fieldsLoading } = useFields()
  const { values: values365, loading: valuesLoading } = useFieldValuesBulk(from365, toDate)
  const { medications } = useMedications()
  const { logs: medLogs365 } = useMedicationLogsBulk(from365, toDate)

  const loading = logsLoading || fieldsLoading || valuesLoading
  const logs = useMemo(() => logs365.filter(l => l.date >= fromDate), [logs365, fromDate])
  const chronologicalLogs = useMemo(() => [...logs].reverse(), [logs])
  const rangeValues = useMemo(() => values365.filter(v => v.date >= fromDate), [values365, fromDate])
  const valuesByField = useMemo(() => {
    const map = new Map<string, FieldValue[]>()
    for (const v of [...rangeValues].sort((a, b) => a.date.localeCompare(b.date))) {
      const list = map.get(v.field_id)
      if (list) list.push(v)
      else map.set(v.field_id, [v])
    }
    return map
  }, [rangeValues])
  const { isDark } = useTheme()
  const streaks = useStreaks(logs365, fields, values365, medLogs365, medications)

  const hasData = chronologicalLogs.length > 0 || rangeValues.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl tracking-[-0.025em] text-ink">Insights</h1>
        <div className="flex gap-1 bg-surface border border-line rounded-full p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-clay-tint text-clay-deep'
                  : 'text-faint'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div role="status" aria-label="Loading" className="flex flex-col gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      )}

      {!loading && !hasData && (
        <div className="text-center text-faint mt-8">
          No entries for this period.
        </div>
      )}

      {!loading && hasData && (
        <>
          {chronologicalLogs.length > 0 && <SleepChart logs={chronologicalLogs} isDark={isDark} />}
          {activeFields
            .filter(f => f.show_in_charts)
            .map(f => (
              <FieldChart key={f.id} field={f} values={valuesByField.get(f.id) ?? []} isDark={isDark} />
            ))}
          <OverlaySection fields={activeFields} valuesByField={valuesByField} logs={chronologicalLogs} isDark={isDark} />
        </>
      )}

      <StatsSection {...streaks} />

      {!loading && hasData && (
        <CorrelationsSection
          fields={activeFields}
          valuesByField={valuesByField}
          logs={chronologicalLogs}
          isDark={isDark}
        />
      )}
    </div>
  )
}
