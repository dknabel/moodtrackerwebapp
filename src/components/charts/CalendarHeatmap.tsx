import { format } from 'date-fns'
import { buildMonthCells } from '../../lib/heatmap'

interface CalendarHeatmapProps {
  month: Date
  valuesByDate: Map<string, number>
  min: number
  max: number
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarHeatmap({ month, valuesByDate, min, max }: CalendarHeatmapProps) {
  const weeks = buildMonthCells(month, valuesByDate, new Date(), min, max)
  return (
    <div role="img" aria-label={`${format(month, 'MMMM yyyy')} mood calendar`} className="flex flex-col gap-1">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="font-mono text-[10px] text-faint text-center">{d}</span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((cell, di) =>
            cell === null ? (
              <span key={di} className="aspect-square" />
            ) : (
              <span
                key={di}
                title={`${cell.date}: ${cell.value ?? 'no data'}`}
                className={`aspect-square rounded-[2px] ${cell.opacity === 0 ? 'border border-line' : ''}`}
                style={cell.opacity > 0 ? { backgroundColor: 'var(--signal)', opacity: cell.opacity } : undefined}
              />
            ),
          )}
        </div>
      ))}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        <span className="font-mono text-[10px] text-faint">Low</span>
        {[0.15, 0.4, 0.65, 1].map(o => (
          <span key={o} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--signal)', opacity: o }} />
        ))}
        <span className="font-mono text-[10px] text-faint">High</span>
      </div>
    </div>
  )
}
