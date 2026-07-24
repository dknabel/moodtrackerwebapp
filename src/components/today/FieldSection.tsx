import type { CustomField, FieldValueData } from '../../lib/database.types'
import { defaultFieldValue, isCompatibleValue } from '../../lib/fields'
import { Slider } from '../ui/Slider'
import { Stepper } from '../ui/Stepper'

interface FieldSectionProps {
  field: CustomField
  value: FieldValueData
  onChange: (value: FieldValueData) => void
}

export function FieldSection({ field, value, onChange }: FieldSectionProps) {
  // A stale value from before a type change falls back to the type default.
  const safe = isCompatibleValue(field.type, value) ? value : defaultFieldValue(field)

  switch (field.type) {
    case 'slider': {
      const min = field.config.min ?? 1
      const max = field.config.max ?? 10
      return (
        <Slider
          label={field.name}
          value={safe as number}
          min={min}
          max={max}
          lowLabel={field.config.lowLabel}
          highLabel={field.config.highLabel}
          hideLabel
          onChange={onChange}
        />
      )
    }
    case 'number':
      return (
        <div className="flex flex-col gap-3">
          <Stepper label={field.name} value={safe as number} unit={field.config.unit} onChange={onChange} />
        </div>
      )
    case 'toggle':
      return (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={safe as boolean}
              onChange={e => onChange(e.target.checked)}
              className="w-5 h-5 accent-clay cursor-pointer"
            />
            <span className="text-sm text-ink">Yes</span>
          </label>
        </div>
      )
    case 'text':
      return (
        <div className="flex flex-col gap-3">
          <label htmlFor={`field-${field.id}`} className="sr-only">{field.name}</label>
          <textarea
            id={`field-${field.id}`}
            rows={4}
            value={safe as string}
            onChange={e => onChange(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface text-ink placeholder:text-faint p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay"
          />
        </div>
      )
    case 'tags': {
      const selected = safe as string[]
      const toggleTag = (tag: string) =>
        onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {(field.config.options ?? []).map(opt => {
              const isOn = selected.includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggleTag(opt)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    isOn
                      ? 'bg-clay-deep text-white border-clay-deep'
                      : 'border-line text-ink'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
  }
}
