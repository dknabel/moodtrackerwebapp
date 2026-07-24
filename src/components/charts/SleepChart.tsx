import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'
import { CHART_COLORS } from '../../lib/chartColors'
import { Section } from '../ui/Section'

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

  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light

  return (
    <Section title="Sleep">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={{ fontSize: 11, fill: tickColor }} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={{ fontSize: 11, fill: tickColor }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line yAxisId="hours" type="monotone" dataKey="Hours" stroke={CHART_COLORS.sleepHours} dot={false} connectNulls />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke={CHART_COLORS.sleepQuality} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </Section>
  )
}
