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
    <div className="min-h-screen bg-bg pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="max-w-[680px] mx-auto px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-2 flex justify-between items-center gap-3">
        <span className="font-serif text-xl text-ink tracking-[-0.02em]">
          Mood <em className="italic text-clay">Tracker</em>
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            className={`p-2 -m-1 text-faint rounded-lg ${focusRing}`}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={signOut}
            className={`p-2 -m-1 text-xs text-faint hover:text-muted rounded-lg ${focusRing}`}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-[680px] mx-auto px-4 pb-4">{children}</main>
      <BottomNav />
    </div>
  )
}
