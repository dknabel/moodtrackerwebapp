import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const { isDark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="max-w-lg mx-auto px-4 pt-4 flex justify-end items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="text-xl leading-none"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
