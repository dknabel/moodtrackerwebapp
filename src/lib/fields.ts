import type { CustomField, FieldConfig, FieldType, FieldValueData } from './database.types'

export interface FieldData {
  name: string
  type: FieldType
  config: FieldConfig
}

/** The six built-ins seeded for every user; must match the 002 migration. */
export const DEFAULT_FIELDS: FieldData[] = [
  { name: 'Mood', type: 'slider', config: { min: 1, max: 10 } },
  { name: 'Energy', type: 'slider', config: { min: 1, max: 10 } },
  { name: 'Anxiety', type: 'slider', config: { min: 1, max: 10 } },
  { name: 'Meals', type: 'number', config: {} },
  { name: 'Exercise', type: 'toggle', config: {} },
  { name: 'Gratitude', type: 'text', config: {} },
]

export function defaultFieldValue(field: Pick<CustomField, 'type' | 'config'>): FieldValueData {
  switch (field.type) {
    case 'slider': {
      const min = field.config.min ?? 1
      const max = field.config.max ?? 10
      return Math.floor((min + max) / 2)
    }
    case 'number': return 0
    case 'toggle': return false
    case 'text': return ''
    case 'tags': return []
  }
}

export function isCompatibleValue(type: FieldType, value: FieldValueData): boolean {
  switch (type) {
    case 'slider':
    case 'number': return typeof value === 'number'
    case 'toggle': return typeof value === 'boolean'
    case 'text': return typeof value === 'string'
    case 'tags': return Array.isArray(value)
  }
}

/** Numeric reading of a value for charts/correlations; null if not chartable. */
export function numericValue(
  field: Pick<CustomField, 'type'>,
  value: FieldValueData | null | undefined
): number | null {
  if (value == null) return null
  if ((field.type === 'slider' || field.type === 'number') && typeof value === 'number') return value
  if (field.type === 'toggle' && typeof value === 'boolean') return value ? 1 : 0
  return null
}

export function displayValue(
  field: Pick<CustomField, 'type' | 'config'>,
  value: FieldValueData
): string {
  if (!isCompatibleValue(field.type, value)) return ''
  switch (field.type) {
    case 'slider': return `${value}/${field.config.max ?? 10}`
    case 'number': return field.config.unit ? `${value} ${field.config.unit}` : String(value)
    case 'toggle': return value ? 'Yes' : 'No'
    case 'text': return value as string
    case 'tags': return (value as string[]).join(', ')
  }
}

export function isCompatibleTypeChange(from: FieldType, to: FieldType): boolean {
  const numeric = (t: FieldType) => t === 'slider' || t === 'number'
  return from === to || (numeric(from) && numeric(to))
}

export function isEmptyValue(value: FieldValueData): boolean {
  return value === '' || (Array.isArray(value) && value.length === 0)
}

export function validateField(data: FieldData, existingNames: string[]): string | null {
  const name = data.name.trim()
  if (!name) return 'Name is required'
  if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) {
    return 'A field with this name already exists'
  }
  if (data.type === 'slider' && (data.config.min ?? 1) >= (data.config.max ?? 10)) {
    return 'Slider minimum must be less than maximum'
  }
  if (data.type === 'tags' && (data.config.options ?? []).length === 0) {
    return 'Add at least one tag option'
  }
  return null
}
