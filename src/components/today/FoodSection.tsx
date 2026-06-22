interface FoodSectionProps {
  value: number
  onChange: (value: number) => void
}

export function FoodSection({ value, onChange }: FoodSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Food</h2>
      <div className="flex items-center gap-6">
        <span className="text-sm text-gray-600 dark:text-gray-400">Meals today</span>
        <div className="flex items-center gap-4 ml-auto">
          <button
            type="button"
            onClick={() => value > 0 && onChange(value - 1)}
            aria-label="−"
            className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40"
            disabled={value === 0}
          >
            −
          </button>
          <span className="text-xl font-semibold w-6 text-center">{value}</span>
          <button
            type="button"
            onClick={() => onChange(value + 1)}
            aria-label="+"
            className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600 text-lg font-medium text-gray-700 dark:text-gray-300"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
