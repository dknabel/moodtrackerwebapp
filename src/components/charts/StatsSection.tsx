interface StreakCardProps {
  label: string
  current: number
  longest: number
}

function StreakCard({ label, current, longest }: StreakCardProps) {
  return (
    <div className="flex flex-col gap-1 py-4 border-b border-line">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
      <p className="font-sans font-semibold text-3xl tnum text-ink">{current}</p>
      <p className="text-xs text-faint">day{current !== 1 ? 's' : ''}</p>
      <p className="font-mono text-xs tnum text-faint mt-1">Longest: {longest}</p>
    </div>
  )
}

interface StreakResult {
  current: number
  longest: number
}

interface Props {
  index: number
  logging: StreakResult
  meds: StreakResult
  toggles: Array<{ name: string; streak: StreakResult }>
}

export function StatsSection({ index, logging, meds, toggles }: Props) {
  const items = [
    { label: 'Logging', ...logging },
    ...toggles.map(t => ({ label: t.name, ...t.streak })),
    { label: 'Medications', ...meds },
  ]
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
        {String(index).padStart(2, '0')} / Streaks
      </h2>
      <div className="flex flex-col">
        {items.map(item => (
          <StreakCard key={item.label} label={item.label} current={item.current} longest={item.longest} />
        ))}
      </div>
    </div>
  )
}
