import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FIELDS, defaultFieldValue, isCompatibleValue, numericValue,
  displayValue, isCompatibleTypeChange, isEmptyValue, validateField,
} from './fields'

describe('DEFAULT_FIELDS', () => {
  it('defines the six built-ins in order', () => {
    expect(DEFAULT_FIELDS.map(f => f.name)).toEqual(
      ['Mood', 'Energy', 'Anxiety', 'Meals', 'Exercise', 'Gratitude']
    )
  })
})

describe('defaultFieldValue', () => {
  it('uses the slider midpoint (floored)', () => {
    expect(defaultFieldValue({ type: 'slider', config: { min: 1, max: 10 } })).toBe(5)
  })
  it('defaults number to 0, toggle to false, text to "", tags to []', () => {
    expect(defaultFieldValue({ type: 'number', config: {} })).toBe(0)
    expect(defaultFieldValue({ type: 'toggle', config: {} })).toBe(false)
    expect(defaultFieldValue({ type: 'text', config: {} })).toBe('')
    expect(defaultFieldValue({ type: 'tags', config: { options: ['a'] } })).toEqual([])
  })
})

describe('isCompatibleValue', () => {
  it('matches value shape to type', () => {
    expect(isCompatibleValue('slider', 7)).toBe(true)
    expect(isCompatibleValue('slider', 'seven')).toBe(false)
    expect(isCompatibleValue('toggle', true)).toBe(true)
    expect(isCompatibleValue('toggle', 1)).toBe(false)
    expect(isCompatibleValue('text', 'hi')).toBe(true)
    expect(isCompatibleValue('tags', ['a'])).toBe(true)
    expect(isCompatibleValue('tags', 'a')).toBe(false)
  })
})

describe('numericValue', () => {
  it('returns numbers for slider/number, 0/1 for toggle, null otherwise', () => {
    expect(numericValue({ type: 'slider' }, 7)).toBe(7)
    expect(numericValue({ type: 'number' }, 3)).toBe(3)
    expect(numericValue({ type: 'toggle' }, true)).toBe(1)
    expect(numericValue({ type: 'toggle' }, false)).toBe(0)
    expect(numericValue({ type: 'slider' }, 'old text')).toBeNull()
    expect(numericValue({ type: 'text' }, 'hi')).toBeNull()
    expect(numericValue({ type: 'slider' }, null)).toBeNull()
  })
})

describe('displayValue', () => {
  it('formats each type', () => {
    expect(displayValue({ type: 'slider', config: { min: 1, max: 10 } }, 7)).toBe('7/10')
    expect(displayValue({ type: 'number', config: { unit: 'cups' } }, 3)).toBe('3 cups')
    expect(displayValue({ type: 'number', config: {} }, 3)).toBe('3')
    expect(displayValue({ type: 'toggle', config: {} }, true)).toBe('Yes')
    expect(displayValue({ type: 'toggle', config: {} }, false)).toBe('No')
    expect(displayValue({ type: 'text', config: {} }, 'grateful')).toBe('grateful')
    expect(displayValue({ type: 'tags', config: {} }, ['work', 'family'])).toBe('work, family')
  })
  it('returns empty string for a value incompatible with the current type', () => {
    expect(displayValue({ type: 'slider', config: {} }, 'was text')).toBe('')
  })
})

describe('isCompatibleTypeChange', () => {
  it('treats slider and number as interchangeable; everything else only with itself', () => {
    expect(isCompatibleTypeChange('slider', 'number')).toBe(true)
    expect(isCompatibleTypeChange('number', 'slider')).toBe(true)
    expect(isCompatibleTypeChange('slider', 'slider')).toBe(true)
    expect(isCompatibleTypeChange('slider', 'text')).toBe(false)
    expect(isCompatibleTypeChange('toggle', 'number')).toBe(false)
  })
})

describe('isEmptyValue', () => {
  it('treats empty string and empty array as empty; 0 and false are not', () => {
    expect(isEmptyValue('')).toBe(true)
    expect(isEmptyValue([])).toBe(true)
    expect(isEmptyValue(0)).toBe(false)
    expect(isEmptyValue(false)).toBe(false)
    expect(isEmptyValue('x')).toBe(false)
  })
})

describe('validateField', () => {
  const slider = (over = {}) => ({ name: 'Stress', type: 'slider' as const, config: { min: 1, max: 10 }, ...over })
  it('accepts a valid field', () => {
    expect(validateField(slider(), ['Mood'])).toBeNull()
  })
  it('rejects blank names', () => {
    expect(validateField(slider({ name: '  ' }), [])).toBe('Name is required')
  })
  it('rejects duplicate names case-insensitively', () => {
    expect(validateField(slider({ name: 'mood' }), ['Mood'])).toBe('A field with this name already exists')
  })
  it('rejects slider with min >= max', () => {
    expect(validateField(slider({ config: { min: 5, max: 5 } }), [])).toBe('Slider minimum must be less than maximum')
  })
  it('rejects tags with no options', () => {
    expect(validateField({ name: 'Triggers', type: 'tags', config: { options: [] } }, []))
      .toBe('Add at least one tag option')
  })
})
