import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btnPrimary } from '../../lib/styles'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
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
      <p className="text-ink text-sm text-center max-w-sm">
        Password reset email sent. Check your inbox and click the link.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="border border-line bg-surface text-ink placeholder-faint rounded-lg p-3 text-base"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className={`${btnPrimary} w-full`}
      >
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
