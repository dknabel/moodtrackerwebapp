import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface ExerciseChartProps {
  logs: DailyLog[]
  isDark?: boolean
}

export function ExerciseChart({ logs, isDark }: ExerciseChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    value: l.exercised ? 1 : 0,
  }))

  const exerciseDays = data.filter(d => d.value === 1).length
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'
  const inactiveBarColor = isDark ? '#4b5563' : '#e5e7eb'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Exercise</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{exerciseDays}/{data.length} days</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip formatter={(v) => [v === 1 ? 'Yes' : 'No', 'Exercised']} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.value ? '#16a34a' : inactiveBarColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
