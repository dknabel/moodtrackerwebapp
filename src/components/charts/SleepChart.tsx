import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'
import { CHART_COLORS } from '../../lib/chartColors'
import { Section } from '../ui/Section'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

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
  const tick = { fontSize: 11, fontFamily: MONO, fill: tickColor } as const

  return (
    <Section index={2} title="Sleep">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis yAxisId="hours" domain={[0, 12]} tick={tick} tickLine={false} axisLine={false} width={28} />
          <YAxis yAxisId="quality" orientation="right" domain={[1, 5]} tick={tick} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
          <Bar yAxisId="hours" dataKey="Hours" fill={CHART_COLORS.sleepHours} barSize={6} radius={[2, 2, 0, 0]} />
          <Line yAxisId="quality" type="monotone" dataKey="Quality" stroke={CHART_COLORS.sleepQuality} strokeWidth={2}
            dot={{ r: 2, fill: CHART_COLORS.sleepQuality, strokeWidth: 0 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="flex gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: CHART_COLORS.sleepHours }} /> Hours
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.sleepQuality }} /> Quality
        </span>
      </p>
    </Section>
  )
}
