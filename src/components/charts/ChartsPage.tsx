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
import { numericValue } from '../../lib/fields'
import { Skeleton } from '../ui/Skeleton'
import { Section } from '../ui/Section'
import { MoodDial } from './MoodDial'
import { RhythmChart } from './RhythmChart'
import { CalendarHeatmap } from './CalendarHeatmap'
import { MedAdherenceSection } from './MedAdherenceSection'
import { SleepChart } from './SleepChart'
import { FieldChart } from './FieldChart'
import { OverlaySection } from './OverlaySection'
import { StatsSection } from './StatsSection'
import { CorrelationsSection } from './CorrelationsSection'
import { buildCorrelationCards } from '../../lib/correlations'
import { buildOverlaySeries } from '../../lib/overlay'

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

  const moodField = useMemo(
    () =>
      activeFields.find(f => f.type === 'slider' && f.name.toLowerCase() === 'mood') ??
      activeFields.find(f => f.type === 'slider') ??
      null,
    [activeFields],
  )
  const moodValues = useMemo(
    () => (moodField ? valuesByField.get(moodField.id) ?? [] : []),
    [moodField, valuesByField],
  )
  const moodSeries = useMemo(
    () =>
      moodValues.map(v => ({
        date: v.date.slice(5),
        fullDate: v.date,
        value: moodField ? numericValue(moodField, v.value) : null,
      })),
    [moodValues, moodField],
  )
  const moodByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of moodSeries) if (p.value !== null) map.set(p.fullDate, p.value)
    return map
  }, [moodSeries])
  const moodMin = moodField?.config.min ?? 1
  const moodMax = moodField?.config.max ?? 10
  const latestMood = moodSeries.length > 0 ? moodSeries[moodSeries.length - 1].value : null
  const recentMood = moodSeries.slice(-8, -1).map(p => p.value).filter((v): v is number => v !== null)

  const chartFields = useMemo(
    () => activeFields.filter(f => f.show_in_charts && f.id !== moodField?.id),
    [activeFields, moodField],
  )
  // FieldChart renders nothing for text fields, fields with no values, or tag
  // fields with no tag values — mirror those early returns exactly so section
  // numbers only count charts that actually appear.
  const visibleChartFields = useMemo(
    () =>
      chartFields.filter(f => {
        if (f.type === 'text') return false
        const vals = valuesByField.get(f.id) ?? []
        if (vals.length === 0) return false
        if (f.type === 'tags') return vals.some(v => Array.isArray(v.value) && v.value.length > 0)
        return true
      }),
    [chartFields, valuesByField],
  )

  const showMood = !!moodField && moodSeries.length > 0
  const showSleep = chronologicalLogs.length > 0
  const showOverlay = useMemo(
    () => buildOverlaySeries(activeFields, valuesByField, chronologicalLogs).length >= 2,
    [activeFields, valuesByField, chronologicalLogs],
  )
  const showMeds = useMemo(() => medications.some(m => m.active), [medications])
  const showComparisons = useMemo(
    () => buildCorrelationCards(activeFields, valuesByField, chronologicalLogs).length > 0,
    [activeFields, valuesByField, chronologicalLogs],
  )

  // Number only the sections that will render, in display order.
  let nextIndex = 1
  const moodIndex = showMood ? nextIndex++ : undefined
  const sleepIndex = showSleep ? nextIndex++ : undefined
  const fieldIndexById = new Map(visibleChartFields.map(f => [f.id, nextIndex++] as [string, number]))
  const overlayIndex = showOverlay ? nextIndex++ : undefined
  const medsIndex = showMeds ? nextIndex++ : undefined
  const streaksIndex = nextIndex++ // StatsSection always renders
  const comparisonsIndex = nextIndex

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="font-sans font-medium text-3xl tracking-[-0.025em] text-ink">Insights</h1>
        <div className="flex gap-1 bg-surface border border-line rounded-full p-1">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRangeDays(r.days)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                rangeDays === r.days
                  ? 'bg-signal text-bg'
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
          {moodField && moodSeries.length > 0 && (
            <Section index={moodIndex} title="Mood">
              <div className="flex flex-col items-center gap-4 pt-2">
                <MoodDial value={latestMood} min={moodMin} max={moodMax} recent={recentMood} />
              </div>
              <RhythmChart data={moodSeries} domain={[moodMin, moodMax]} isDark={isDark} />
              <CalendarHeatmap month={new Date()} valuesByDate={moodByDate} min={moodMin} max={moodMax} />
            </Section>
          )}
          {sleepIndex !== undefined && <SleepChart logs={chronologicalLogs} index={sleepIndex} isDark={isDark} />}
          {visibleChartFields.map(f => (
            <FieldChart key={f.id} field={f} values={valuesByField.get(f.id) ?? []} index={fieldIndexById.get(f.id)} isDark={isDark} />
          ))}
          {overlayIndex !== undefined && (
            <OverlaySection fields={activeFields} valuesByField={valuesByField} logs={chronologicalLogs} index={overlayIndex} isDark={isDark} />
          )}
          {medsIndex !== undefined && (
            <MedAdherenceSection index={medsIndex} medications={medications} logs={medLogs365} />
          )}
        </>
      )}

      <StatsSection index={streaksIndex} {...streaks} />

      {!loading && hasData && showComparisons && (
        <CorrelationsSection
          fields={activeFields}
          valuesByField={valuesByField}
          logs={chronologicalLogs}
          index={comparisonsIndex}
          isDark={isDark}
        />
      )}
    </div>
  )
}
