import { useNavigate } from 'react-router-dom'
import type { DailyLog } from '../../lib/database.types'

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + '…'
}

interface HistoryEntryProps {
  log: DailyLog
}

export function HistoryEntry({ log }: HistoryEntryProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/log/${log.date}`)}
      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-1"
    >
      <span className="text-sm font-semibold text-gray-900">{log.date}</span>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {log.mood_rating !== null && <span>Mood {log.mood_rating}/10</span>}
        {log.mood_energy !== null && <span>Energy {log.mood_energy}/10</span>}
        {log.mood_anxiety !== null && <span>Anxiety {log.mood_anxiety}/10</span>}
        {log.sleep_hours !== null && <span>Sleep {log.sleep_hours}h</span>}
        {log.meals_count !== null && <span>{log.meals_count} meals</span>}
        {log.exercised !== null && (
          <span>{log.exercised ? '✓ Exercised' : '✗ No exercise'}</span>
        )}
      </div>
      {log.gratitude && (
        <blockquote className="text-xs text-gray-500 italic mt-1">
          "{truncate(log.gratitude, 80)}"
        </blockquote>
      )}
    </button>
  )
}
