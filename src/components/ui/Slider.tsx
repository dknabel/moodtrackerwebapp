interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  onChange: (value: number) => void
}

export function Slider({ label, value, min = 1, max = 10, lowLabel, highLabel, onChange }: SliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-sm text-ink">{label}</span>
        <span className="font-serif text-lg text-clay">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onKeyDown={e => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(Math.min(max, value + 1))
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(Math.max(min, value - 1))
          }
        }}
        className="w-full accent-clay h-2 cursor-pointer"
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-faint">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}
