import { BottomNav } from './BottomNav'
import { useAuth } from '../../hooks/useAuth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="max-w-lg mx-auto px-4 pt-4 flex justify-end">
        <button
          type="button"
          onClick={() => signOut()}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
