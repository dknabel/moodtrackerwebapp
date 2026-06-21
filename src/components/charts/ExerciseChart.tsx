import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'

interface ExerciseChartProps {
  logs: DailyLog[]
}

export function ExerciseChart({ logs }: ExerciseChartProps) {
  const data = logs.map(l => ({
    date: l.date.slice(5),
    value: l.exercised ? 1 : 0,
  }))

  const exerciseDays = data.filter(d => d.value === 1).length

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Exercise</h2>
        <span className="text-xs text-gray-500">{exerciseDays}/{data.length} days</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [v === 1 ? 'Yes' : 'No', 'Exercised']} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.value ? '#16a34a' : '#e5e7eb'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
