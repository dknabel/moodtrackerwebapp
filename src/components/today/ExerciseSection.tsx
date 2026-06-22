interface ExerciseSectionProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function ExerciseSection({ value, onChange }: ExerciseSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Exercise</h2>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
          className="w-5 h-5 accent-blue-600 cursor-pointer"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">Exercised today</span>
      </label>
    </div>
  )
}
