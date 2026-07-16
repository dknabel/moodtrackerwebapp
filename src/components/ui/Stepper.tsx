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
        className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40"
        disabled={value === 0}
      >
        −
      </button>
      <span className="text-xl font-semibold w-6 text-center dark:text-white">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
        className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300"
      >
        +
      </button>
      {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
    </div>
  )
}
