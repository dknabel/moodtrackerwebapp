import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './components/auth/AuthPage'
import { AppShell } from './components/layout/AppShell'
import { TodayPage } from './components/today/TodayPage'
import { HistoryPage } from './components/history/HistoryPage'
import { ChartsPage } from './components/charts/ChartsPage'

export function App() {
  const { session, loading, isPasswordRecovery } = useAuth()

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

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/log/:date" element={<TodayPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/charts" element={<ChartsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <Analytics />
    </BrowserRouter>
  )
}
