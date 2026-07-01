import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { DailyLog } from '../../lib/database.types'
import { computeCorrelation } from '../../lib/correlations'

interface Props {
  logs: DailyLog[]
  isDark: boolean
}

interface Config {
  title: string
  yKey: keyof DailyLog
  xKey: keyof DailyLog
  splitFn: (l: DailyLog) => boolean
  labelA: string
  labelB: string
  point: (l: DailyLog) => { x: number; y: number }
  xAxisLabel: string
  yAxisLabel: string
}

const CONFIGS: Config[] = [
  {
    title: 'Exercise vs Mood',
    yKey: 'mood_rating',
    xKey: 'exercised',
    splitFn: l => !!l.exercised,
    labelA: 'Exercised',
    labelB: 'Not exercised',
    xAxisLabel: 'Exercised (1=yes, 0=no)',
    yAxisLabel: 'Mood',
    point: l => ({ x: l.exercised ? 1 : 0, y: l.mood_rating! }),
  },
  {
    title: 'Sleep Hours vs Mood',
    yKey: 'mood_rating',
    xKey: 'sleep_hours',
    splitFn: l => (l.sleep_hours ?? 0) >= 7,
    labelA: '7+ hours',
    labelB: '<7 hours',
    xAxisLabel: 'Sleep hours',
    yAxisLabel: 'Mood',
    point: l => ({ x: l.sleep_hours!, y: l.mood_rating! }),
  },
  {
    title: 'Meals vs Mood',
    yKey: 'mood_rating',
    xKey: 'meals_count',
    splitFn: l => (l.meals_count ?? 0) >= 3,
    labelA: '3+ meals',
    labelB: '0-2 meals',
    xAxisLabel: 'Meals count',
    yAxisLabel: 'Mood',
    point: l => ({ x: l.meals_count!, y: l.mood_rating! }),
  },
  {
    title: 'Sleep Quality vs Energy',
    yKey: 'mood_energy',
    xKey: 'sleep_quality',
    splitFn: l => (l.sleep_quality ?? 0) >= 3,
    labelA: 'Quality 3-5',
    labelB: 'Quality 1-2',
    xAxisLabel: 'Sleep quality (1-5)',
    yAxisLabel: 'Energy',
    point: l => ({ x: l.sleep_quality!, y: l.mood_energy! }),
  },
]

export function CorrelationsSection({ logs, isDark }: Props) {
  const tickColor = isDark ? '#9ca3af' : '#6b7280'
  const blue = '#2563eb'
  const gray = isDark ? '#4b5563' : '#d1d5db'

  const cards = useMemo(() =>
    CONFIGS.map(cfg => {
      const result = computeCorrelation(logs, cfg.yKey, cfg.splitFn, cfg.labelA, cfg.labelB, { xKey: cfg.xKey })
      const eligible = logs.filter(l => l[cfg.yKey] != null && l[cfg.xKey] != null)
      const pA = eligible.filter(cfg.splitFn).map(cfg.point)
      const pB = eligible.filter(l => !cfg.splitFn(l)).map(cfg.point)
      return { cfg, result, pA, pB }
    }).filter(c => c.result.hasEnoughData),
    [logs]
  )

  if (cards.length === 0) return null

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Correlations</h2>
      {cards.map(({ cfg, result, pA, pB }) => (
        <div key={cfg.title} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <p className="font-medium text-gray-900 dark:text-white">{cfg.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {result.groupA.label}: avg {result.groupA.avg} ({result.groupA.count} days) —{' '}
            {result.groupB.label}: avg {result.groupB.avg} ({result.groupB.count} days)
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <ScatterChart>
              <XAxis
                dataKey="x"
                name={cfg.xAxisLabel}
                tick={{ fontSize: 11, fill: tickColor }}
                stroke={tickColor}
              />
              <YAxis
                dataKey="y"
                name={cfg.yAxisLabel}
                domain={[1, 10]}
                tick={{ fontSize: 11, fill: tickColor }}
                stroke={tickColor}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Scatter name={result.groupA.label} data={pA} fill={blue} />
              <Scatter name={result.groupB.label} data={pB} fill={gray} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  )
}
