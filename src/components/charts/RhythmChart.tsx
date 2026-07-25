import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '../../lib/chartColors'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

interface RhythmChartProps {
  data: Array<{ date: string; value: number | null }>
  domain: [number, number]
  isDark?: boolean
}

export function RhythmChart({ data, domain, isDark }: RhythmChartProps) {
  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const tick = { fontSize: 11, fontFamily: MONO, fill: tickColor } as const
  const signal = CHART_COLORS.series[0]

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="moodGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={signal} stopOpacity={0.35} />
            <stop offset="100%" stopColor={signal} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={gridColor} />
        <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={{ stroke: gridColor }} />
        <YAxis domain={domain} tick={tick} tickLine={false} axisLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
        <Area type="monotone" dataKey="value" stroke={signal} strokeWidth={2}
          fill="url(#moodGlow)" dot={{ r: 2, fill: signal, strokeWidth: 0 }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  )
}
