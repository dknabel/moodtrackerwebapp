import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mq = {
    matches,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => { listeners.push(fn) },
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      const i = listeners.indexOf(fn)
      if (i !== -1) listeners.splice(i, 1)
    },
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(mq as unknown as MediaQueryList)
  return {
    triggerChange: (val: boolean) =>
      listeners.forEach(fn => fn({ matches: val } as MediaQueryListEvent)),
  }
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => vi.restoreAllMocks())

  it('defaults to dark when system preference is dark', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('defaults to light when system preference is light', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('reads "dark" from localStorage over system preference', () => {
    localStorage.setItem('theme', 'dark')
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(true)
  })

  it('reads "light" from localStorage over system preference', () => {
    localStorage.setItem('theme', 'light')
    mockMatchMedia(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(false)
  })

  it('toggle flips isDark and persists to localStorage', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
    act(() => result.current.toggle())
    expect(result.current.isDark).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('follows OS changes when no explicit preference is saved', () => {
    const { triggerChange } = mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(false)
    act(() => triggerChange(true))
    expect(result.current.isDark).toBe(true)
  })

  it('ignores OS changes when user has an explicit preference', () => {
    localStorage.setItem('theme', 'light')
    const { triggerChange } = mockMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => triggerChange(true))
    expect(result.current.isDark).toBe(false)
  })
})
