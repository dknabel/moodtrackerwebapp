interface StreakCardProps {
  label: string
  current: number
  longest: number
}

function StreakCard({ label, current, longest }: StreakCardProps) {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{current}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">day{current !== 1 ? 's' : ''}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Longest: {longest}</p>
    </div>
  )
}

interface StreakResult {
  current: number
  longest: number
}

interface Props {
  logging: StreakResult
  meds: StreakResult
  toggles: Array<{ name: string; streak: StreakResult }>
}

export function StatsSection({ logging, meds, toggles }: Props) {
  const items = [
    { label: 'Logging', ...logging },
    ...toggles.map(t => ({ label: t.name, ...t.streak })),
    { label: 'Medications', ...meds },
  ]
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Streaks</h2>
      <div className="flex gap-3 flex-wrap">
        {items.map(item => (
          <StreakCard key={item.label} label={item.label} current={item.current} longest={item.longest} />
        ))}
      </div>
    </div>
  )
}
