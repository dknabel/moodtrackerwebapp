import { format, subDays } from 'date-fns'
import { supabase } from './supabase'
import type { CustomField, DailyLog, FieldValue, Medication, MedicationLog } from './database.types'

export type ExportRange = '30' | '90' | 'all'

export interface ExportData {
  logs: DailyLog[]
  medications: Medication[]
  medLogs: MedicationLog[]
  fields: CustomField[]
  fieldValues: FieldValue[]
}

export async function fetchExportData(range: ExportRange): Promise<ExportData> {
  const today = format(new Date(), 'yyyy-MM-dd')

  let logsQuery = supabase
    .from('daily_logs')
    .select('*')
    .lte('date', today)
    .order('date', { ascending: false })
  let medLogsQuery = supabase
    .from('medication_logs')
    .select('*')
    .lte('date', today)
  let valuesQuery = supabase
    .from('field_values')
    .select('*')
    .lte('date', today)

  if (range !== 'all') {
    const from = format(subDays(new Date(), range === '30' ? 30 : 90), 'yyyy-MM-dd')
    logsQuery = logsQuery.gte('date', from)
    medLogsQuery = medLogsQuery.gte('date', from)
    valuesQuery = valuesQuery.gte('date', from)
  }

  const [logsRes, medsRes, medLogsRes, fieldsRes, valuesRes] = await Promise.all([
    logsQuery,
    supabase
      .from('medications')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true }),
    medLogsQuery,
    supabase.from('custom_fields').select('*').order('sort_order', { ascending: true }),
    valuesQuery,
  ])

  const error =
    logsRes.error ?? medsRes.error ?? medLogsRes.error ?? fieldsRes.error ?? valuesRes.error
  if (error) throw new Error(error.message)

  return {
    logs: logsRes.data ?? [],
    medications: medsRes.data ?? [],
    medLogs: medLogsRes.data ?? [],
    fields: fieldsRes.data ?? [],
    fieldValues: valuesRes.data ?? [],
  }
}
