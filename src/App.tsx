import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './hooks/useAuth'
import { useNotificationSync } from './hooks/useNotificationSync'
import { useOAuthDeepLink } from './hooks/useOAuthDeepLink'
import { AuthPage } from './components/auth/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TodayPage } from './components/today/TodayPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ChartsPage } from './components/charts/ChartsPage'
import { RemindersPage } from './components/reminders/RemindersPage'

export function App() {
  useOAuthDeepLink()
  const { session, loading, isPasswordRecovery, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 dark:bg-gray-900 dark:text-gray-500">
        Loading…
      </div>
    )
  }

  if (!session || isPasswordRecovery) {
    return <AuthPage initialMode={isPasswordRecovery ? 'reset-password' : 'sign-in'} />
  }

  return <AuthenticatedApp signOut={signOut} />
}

function AuthenticatedApp({ signOut }: { signOut: () => void }) {
  useNotificationSync()

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppShell signOut={signOut}>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/log/:date" element={<TodayPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <Analytics />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
