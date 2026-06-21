import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-center text-lg text-gray-700">
          Check your email for a login link.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-4"
    >
      <h1 className="text-2xl font-bold text-gray-900">Mood Tracker</h1>
      <p className="text-gray-500 text-sm">Enter your email to sign in</p>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-full max-w-sm border border-gray-300 rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full max-w-sm bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send link'}
      </button>
    </form>
  )
}
