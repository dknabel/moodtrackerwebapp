import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface MealsChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function MealsChart({ logs, isDark }: MealsChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    Meals: l.meals_count,
  }))

  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Meals per Day</h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Bar dataKey="Meals" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
