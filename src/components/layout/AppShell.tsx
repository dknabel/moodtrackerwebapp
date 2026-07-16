import type { ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { useTheme } from '../../hooks/useTheme'
import { focusRing } from '../../lib/styles'

interface Props {
  children: ReactNode
  signOut: () => void
}

export function AppShell({ children, signOut }: Props) {
  const { isDark, toggle } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="max-w-lg mx-auto px-4 pt-4 pb-2 flex justify-between items-center gap-3">
        <span className="text-lg font-bold text-gray-900 dark:text-white">Mood Tracker</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            className={`p-2 -m-1 text-gray-500 dark:text-gray-400 rounded-lg ${focusRing}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={signOut}
            className={`p-2 -m-1 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg ${focusRing}`}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pb-4">{children}</main>
      <BottomNav />
    </div>
  )
}
