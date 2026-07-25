interface StepperProps {
  label: string
  value: number
  unit?: string
  onChange: (value: number) => void
}

export function Stepper({ label, value, unit, onChange }: StepperProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => value > 0 && onChange(value - 1)}
        aria-label={`Decrease ${label}`}
        className="w-9 h-9 rounded-full border border-line text-lg font-medium text-ink transition-colors duration-150 hover:border-ink disabled:opacity-40"
        disabled={value === 0}
      >
        −
      </button>
      <span className="font-mono text-xl tnum w-8 text-center text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
        className="w-9 h-9 rounded-full border border-line text-lg font-medium text-ink transition-colors duration-150 hover:border-ink"
      >
        +
      </button>
      {unit && <span className="text-sm text-faint">{unit}</span>}
    </div>
  )
}
