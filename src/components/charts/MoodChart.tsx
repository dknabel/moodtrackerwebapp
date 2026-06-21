import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MoodChartProps {
  logs: DailyLog[]
}

export function MoodChart({ logs }: MoodChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),  // 'MM-DD'
    Mood: l.mood_rating,
    Energy: l.mood_energy,
    Anxiety: l.mood_anxiety,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Mood / Energy / Anxiety</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[1, 10]} tick={{ fontSize: 11 }} />
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
