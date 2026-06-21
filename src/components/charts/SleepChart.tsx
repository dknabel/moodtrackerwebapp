import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface SleepChartProps {
  logs: DailyLog[]
}

export function SleepChart({ logs }: SleepChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Hours: l.sleep_hours,
    Quality: l.sleep_quality,
  }))

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Sleep</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="hours" type="monotone" dataKey="Hours" stroke="#7c3aed" dot={false} connectNulls />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke="#0891b2" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
