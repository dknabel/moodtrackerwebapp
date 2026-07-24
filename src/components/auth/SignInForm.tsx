import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btnPrimary, linkText } from '../../lib/styles'

interface Props {
  onForgotPassword: () => void
}

export function SignInForm({ onForgotPassword }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
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
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="border border-line bg-surface text-ink placeholder-faint rounded-lg p-3 text-base"
      />
      {error && (
        <>
          <p className="text-danger text-sm">{error}</p>
          {error === 'Invalid login credentials' && (
            <p className="text-muted text-xs text-center">
              Signed up with Google? Use the button above.
            </p>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={loading}
        className={`${btnPrimary} w-full`}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={onForgotPassword}
        className={`${linkText} text-sm text-center`}
      >
        Forgot password?
      </button>
    </form>
  )
}
