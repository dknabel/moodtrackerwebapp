import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface SleepChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function SleepChart({ logs, isDark }: SleepChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Hours: l.sleep_hours,
    Quality: l.sleep_quality,
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Sleep</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="hours" type="monotone" dataKey="Hours" stroke="#7c3aed" dot={false} connectNulls />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke="#0891b2" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
