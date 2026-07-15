import { useNavigate } from 'react-router-dom'
import type { CustomField, FieldValueData } from '../../lib/database.types'
import { displayValue } from '../../lib/fields'

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

export interface HistoryItem {
  field: CustomField
  value: FieldValueData
}

interface HistoryEntryProps {
  date: string
  sleepHours: number | null
  items: HistoryItem[]
}

export function HistoryEntry({ date, sleepHours, items }: HistoryEntryProps) {
  const navigate = useNavigate()
  const textItems = items.filter(i => i.field.type === 'text' && displayValue(i.field, i.value))
  const chipItems = items.filter(i => i.field.type !== 'text' && displayValue(i.field, i.value))

  return (
    <button
      type="button"
      onClick={() => navigate(`/log/${date}`)}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-1"
    >
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{date}</span>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {sleepHours !== null && <span>Sleep {sleepHours}h</span>}
        {chipItems.map(({ field, value }) => (
          <span key={field.id}>
            {field.type === 'slider'
              ? `${field.name} ${displayValue(field, value)}`
              : `${field.name}: ${displayValue(field, value)}`}
          </span>
        ))}
      </div>
      {textItems.map(({ field, value }) => (
        <blockquote key={field.id} className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
          "{truncate(displayValue(field, value), 80)}"
        </blockquote>
      ))}
    </button>
  )
}
