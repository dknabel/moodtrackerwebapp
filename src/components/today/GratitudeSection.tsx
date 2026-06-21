interface GratitudeSectionProps {
  value: string
  onChange: (value: string) => void
}

export function GratitudeSection({ value, onChange }: GratitudeSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-gray-900">Gratitude</h2>
      <textarea
        rows={4}
        placeholder="What are you grateful for today?"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
