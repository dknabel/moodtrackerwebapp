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

interface Props {
  logging: { current: number; longest: number }
  exercise: { current: number; longest: number }
  meds: { current: number; longest: number }
}

export function StatsSection({ logging, exercise, meds }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Streaks</h2>
      <div className="flex gap-3">
        <StreakCard label="Logging" current={logging.current} longest={logging.longest} />
        <StreakCard label="Exercise" current={exercise.current} longest={exercise.longest} />
        <StreakCard label="Medications" current={meds.current} longest={meds.longest} />
      </div>
    </div>
  )
}
