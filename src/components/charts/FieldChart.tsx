import type { ReactNode } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { CustomField, FieldValue } from '../../lib/database.types'
import { numericValue } from '../../lib/fields'
import { Card } from '../ui/Card'

interface FieldChartProps {
  field: CustomField
  values: FieldValue[]
  isDark?: boolean
}

function ChartCard({ title, right, children }: {
  title: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <div className="flex justify-between items-baseline mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
        {right}
      </div>
      {children}
    </Card>
  )
}

export function FieldChart({ field, values, isDark }: FieldChartProps) {
  const gridColor = isDark ? '#374151' : '#f0f0f0'
  const tickColor = isDark ? '#9ca3af' : '#666'

  if (field.type === 'text' || values.length === 0) return null

  if (field.type === 'tags') {
    const counts = new Map<string, number>()
    for (const v of values) {
      if (!Array.isArray(v.value)) continue
      for (const tag of v.value) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    const max = sorted[0][1]
    return (
      <ChartCard title={field.name}>
        <div className="flex flex-col gap-2">
          {sorted.map(([tag, count]) => (
            <div key={tag} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate text-gray-700 dark:text-gray-300">{tag}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-4">
                <div
                  className="bg-blue-600 h-4 rounded"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-gray-500 dark:text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    )
  }

  const data = values.map(v => ({
    date: v.date.slice(5),
    value: numericValue(field, v.value),
  }))

  if (field.type === 'toggle') {
    const yesDays = data.filter(d => d.value === 1).length
    const inactiveBarColor = isDark ? '#4b5563' : '#e5e7eb'
    return (
      <ChartCard
        title={field.name}
        right={
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {yesDays}/{data.length} days
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} barSize={8}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip formatter={v => [v === 1 ? 'Yes' : 'No', field.name]} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.value ? '#16a34a' : inactiveBarColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    )
  }

  // slider / number → line chart
  const domain: [number | string, number | string] =
    field.type === 'slider'
      ? [field.config.min ?? 1, field.config.max ?? 10]
      : [0, 'auto']

  return (
    <ChartCard title={field.name}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis domain={domain} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" name={field.name} stroke="#2563eb" dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
