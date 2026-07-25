import { gaugeArc, arcPath, deltaVsAverage } from '../../lib/dial'

interface MoodDialProps {
  value: number | null
  min: number
  max: number
  /** Trailing values (most recent first or any order) used for the vs-average delta. */
  recent: number[]
}

const CX = 80
const CY = 80
const R = 64

export function MoodDial({ value, min, max, recent }: MoodDialProps) {
  const delta = value !== null ? deltaVsAverage(value, recent) : null
  return (
    <div
      role="img"
      aria-label={value !== null ? `Mood ${value} of ${max}` : 'Mood: no data'}
      className="relative w-40 h-40 animate-dial-pulse"
    >
      <svg viewBox="0 0 160 160" className="w-full h-full">
        <path
          d={arcPath(CX, CY, R, -135, 135)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {value !== null && (
          <path
            d={gaugeArc(value, min, max, CX, CY, R)}
            fill="none"
            stroke="var(--signal)"
            strokeWidth={8}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="font-sans font-semibold text-4xl tnum text-ink leading-none">
          {value !== null ? value : '–'}
        </span>
        {delta !== null && (
          <span className="font-mono text-[11px] tnum text-faint">
            {delta >= 0 ? '▲ +' : '▼ −'}{Math.abs(delta).toFixed(1)} vs 7d
          </span>
        )}
      </div>
    </div>
  )
}
