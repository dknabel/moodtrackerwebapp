import { useEffect, useRef, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { format, subDays, parseISO, isValid } from 'date-fns'
import { Check } from 'lucide-react'
import { useDailyLog } from '../../hooks/useDailyLog'
import { useFields } from '../../hooks/useFields'
import { useFieldValues } from '../../hooks/useFieldValues'
import type { CustomField, DailyLog, DailyLogUpdate, FieldValueData } from '../../lib/database.types'
import { defaultFieldValue } from '../../lib/fields'
import { Card } from '../ui/Card'
import { FieldSection } from './FieldSection'
import { ManageFieldsModal } from './ManageFieldsModal'
import { MedsSection } from './MedsSection'
import { SleepSection } from './SleepSection'

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd')
}

function isValidDateParam(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const parsed = parseISO(s)
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === s
}

interface FormState {
  bedtime: string
  wake_time: string
  sleep_hours: number | null
  sleep_quality: number
  tonight_bedtime: string
  fieldValues: Record<string, FieldValueData>
}

const toSleepData = (f: FormState): DailyLogUpdate => ({
  bedtime: f.bedtime || null,
  wake_time: f.wake_time || null,
  sleep_hours: f.sleep_hours,
  sleep_quality: f.sleep_quality,
  tonight_bedtime: f.tonight_bedtime || null,
})

function initialForm(
  log: DailyLog | null,
  autoBedtime: string,
  fields: CustomField[],
  values: Record<string, FieldValueData>
): FormState {
  const fieldValues: Record<string, FieldValueData> = {}
  for (const f of fields) fieldValues[f.id] = values[f.id] ?? defaultFieldValue(f)
  return {
    bedtime: log?.bedtime?.slice(0, 5) || autoBedtime,
    wake_time: log?.wake_time?.slice(0, 5) ?? '',
    sleep_hours: log?.sleep_hours ?? null,
    sleep_quality: log?.sleep_quality ?? 3,
    tonight_bedtime: log?.tonight_bedtime?.slice(0, 5) ?? '',
    fieldValues,
  }
}

export function TodayPage() {
  const { date: dateParam } = useParams<{ date?: string }>()
  const paramValid = dateParam == null || isValidDateParam(dateParam)
  const date = dateParam != null && paramValid ? dateParam : todayStr()
  const yesterday = format(subDays(parseISO(date), 1), 'yyyy-MM-dd')

  const { log, loading, error, save } = useDailyLog(date)
  const { log: yesterdayLog, loading: yesterdayLoading } = useDailyLog(yesterday)
  const {
    fields, activeFields, loading: fieldsLoading, error: fieldsError,
    addField, updateField, archiveField, reactivateField, deleteField, moveField,
  } = useFields()
  const { values, loading: valuesLoading, error: valuesError, saveAll } = useFieldValues(date)
  const [showManage, setShowManage] = useState(false)

  if (!paramValid) {
    return <Navigate to="/" replace />
  }

  if (loading || yesterdayLoading || fieldsLoading || valuesLoading) {
    return <div className="text-center text-gray-400 dark:text-gray-500 mt-12">Loading…</div>
  }

  const loadError = error ?? fieldsError ?? valuesError
  if (loadError) {
    return <div className="text-center text-red-500 mt-12">Could not load this entry: {loadError}</div>
  }

  const autoBedtime = yesterdayLog?.tonight_bedtime?.slice(0, 5) ?? ''

  return (
    <>
      <LogForm
        key={date}
        date={date}
        fields={activeFields}
        initial={initialForm(log, autoBedtime, activeFields, values)}
        save={save}
        saveValues={saveAll}
        onManageFields={() => setShowManage(true)}
      />
      {showManage && (
        <ManageFieldsModal
          fields={fields}
          onAdd={addField}
          onUpdate={updateField}
          onArchive={archiveField}
          onReactivate={reactivateField}
          onDelete={deleteField}
          onMove={moveField}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  )
}

interface LogFormProps {
  date: string
  fields: CustomField[]
  initial: FormState
  save: (values: DailyLogUpdate) => Promise<{ error: string | null }>
  saveValues: (values: Record<string, FieldValueData>) => Promise<{ error: string | null }>
  onManageFields: () => void
}

function LogForm({ date, fields, initial, save, saveValues, onManageFields }: LogFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(savedTimeout.current), [])

  const fieldValue = (f: CustomField) => form.fieldValues[f.id] ?? defaultFieldValue(f)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    const [logRes, valuesRes] = await Promise.all([
      save(toSleepData(form)),
      saveValues(form.fieldValues),
    ])
    const error = logRes.error ?? valuesRes.error
    if (error) {
      setSaveError(error)
    } else {
      setSaved(true)
      clearTimeout(savedTimeout.current)
      savedTimeout.current = setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const isToday = date === todayStr()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {isToday ? 'Today' : date}
        </h1>
        <button
          type="button"
          onClick={onManageFields}
          className="text-sm text-blue-600 dark:text-blue-400 font-medium"
        >
          Manage fields
        </button>
      </div>

      <Card>
        <SleepSection
          values={{
            bedtime: form.bedtime,
            wake_time: form.wake_time,
            sleep_hours: form.sleep_hours,
            sleep_quality: form.sleep_quality,
            tonight_bedtime: form.tonight_bedtime,
          }}
          onChange={v => setForm(f => ({ ...f, ...v }))}
        />
      </Card>

      {fields.map(field => (
        <Card key={field.id}>
          <FieldSection
            field={field}
            value={fieldValue(field)}
            onChange={v =>
              setForm(f => ({ ...f, fieldValues: { ...f.fieldValues, [field.id]: v } }))
            }
          />
        </Card>
      ))}

      <Card>
        <MedsSection date={date} />
      </Card>

      {saveError && (
        <p className="text-red-600 text-sm">{saveError}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? 'Saving…' : saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : 'Save'}
      </button>
    </div>
  )
}
