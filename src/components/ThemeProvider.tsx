import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ThemeContext } from '../hooks/themeContext'

function getInitialTheme(): boolean {
  // Dark-first: unset localStorage defaults to dark; a stored 'light' choice still wins.
  return localStorage.getItem('theme') !== 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>
}
