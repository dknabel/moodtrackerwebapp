import { Slider } from '../ui/Slider'

interface MoodValues {
  mood_rating: number
  mood_energy: number
  mood_anxiety: number
}

interface MoodSectionProps {
  values: MoodValues
  onChange: (values: MoodValues) => void
}

export function MoodSection({ values, onChange }: MoodSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <Slider
        label="Mood"
        value={values.mood_rating}
        onChange={v => onChange({ ...values, mood_rating: v })}
      />
      <Slider
        label="Energy"
        value={values.mood_energy}
        onChange={v => onChange({ ...values, mood_energy: v })}
      />
      <Slider
        label="Anxiety"
        value={values.mood_anxiety}
        onChange={v => onChange({ ...values, mood_anxiety: v })}
      />
    </div>
  )
}
