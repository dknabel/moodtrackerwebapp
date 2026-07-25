import type { ReactNode } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { CustomField, FieldValue } from '../../lib/database.types'
import { CHART_COLORS } from '../../lib/chartColors'
import { numericValue } from '../../lib/fields'
import { Section } from '../ui/Section'
import { ChartTooltip } from './ChartTooltip'

const MONO = 'JetBrains Mono Variable'

interface FieldChartProps {
  field: CustomField
  values: FieldValue[]
  index?: number
  isDark?: boolean
}

function ChartCard({ index, title, right, children }: {
  index?: number
  title: string
  right?: ReactNode
  children: ReactNode
}) {
  return <Section index={index} title={title} action={right}>{children}</Section>
}

export function FieldChart({ field, values, index, isDark }: FieldChartProps) {
  const gridColor = isDark ? CHART_COLORS.grid.dark : CHART_COLORS.grid.light
  const tickColor = isDark ? CHART_COLORS.tick.dark : CHART_COLORS.tick.light
  const tick = { fontSize: 11, fontFamily: MONO, fill: tickColor } as const

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
      <ChartCard index={index} title={field.name}>
        <div className="flex flex-col gap-2">
          {sorted.map(([tag, count]) => (
            <div key={tag} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate text-ink">{tag}</span>
              <div className="flex-1 bg-line rounded-[2px] h-3">
                <div
                  className="h-3 rounded-[2px]"
                  style={{ width: `${(count / max) * 100}%`, backgroundColor: CHART_COLORS.barActive }}
                />
              </div>
              <span className="w-6 text-right font-mono text-xs tnum text-faint">{count}</span>
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
    return (
      <ChartCard
        index={index}
        title={field.name}
        right={<span className="font-mono text-xs tnum text-faint">{yesDays}/{data.length} days</span>}
      >
        <div
          role="img"
          aria-label={`${field.name}: yes on ${yesDays} of ${data.length} days`}
          className="flex gap-[3px]"
        >
          {data.map(d => (
            <div
              key={d.date}
              title={`${d.date}: ${d.value === 1 ? 'Yes' : 'No'}`}
              className={`h-6 flex-1 rounded-[2px] ${d.value === 1 ? 'bg-signal' : 'border border-line'}`}
            />
          ))}
        </div>
      </ChartCard>
    )
  }

  // slider / number → line chart
  const domain: [number | string, number | string] =
    field.type === 'slider'
      ? [field.config.min ?? 1, field.config.max ?? 10]
      : [0, 'auto']

  return (
    <ChartCard index={index} title={field.name}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={{ stroke: gridColor }} />
          <YAxis domain={domain} tick={tick} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: gridColor }} />
          <Line type="monotone" dataKey="value" name={field.name} stroke={CHART_COLORS.series[0]} strokeWidth={2}
            dot={{ r: 2, fill: CHART_COLORS.series[0], strokeWidth: 0 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
