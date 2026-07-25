interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  unit?: string
}

export function ChartTooltip({ active, payload, label, unit = '' }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-surface border border-line rounded-lg px-3 py-2 flex flex-col gap-1">
      {label !== undefined && (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">{label}</p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="font-mono text-xs tnum text-ink flex items-center gap-2">
          {p.color && (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          )}
          <span className="text-muted">{p.name}</span>
          <span>{p.value}{unit}</span>
        </p>
      ))}
    </div>
  )
}
