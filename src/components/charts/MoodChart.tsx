import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MoodChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function MoodChart({ logs, isDark }: MoodChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Mood: l.mood_rating,
    Energy: l.mood_energy,
    Anxiety: l.mood_anxiety,
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Mood / Energy / Anxiety</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Mood" stroke="#2563eb" dot={false} connectNulls />
          <Line type="monotone" dataKey="Energy" stroke="#16a34a" dot={false} connectNulls />
          <Line type="monotone" dataKey="Anxiety" stroke="#dc2626" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
