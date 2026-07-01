import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  onSuccess: (email: string) => void
  onSwitchToSignIn: () => void
}

export function SignUpForm({ onSuccess, onSwitchToSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('already-exists')
      } else {
        setError(error.message)
      }
    } else if (data.user && data.user.identities?.length === 0) {
      // Email enumeration protection returns a fake success with an empty
      // identities array when the address is already registered.
      setError('already-exists')
    } else {
      onSuccess(email)
    }
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
        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm password"
        required
        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 rounded-lg p-3 text-base"
      />
      {error === 'already-exists' ? (
        <p className="text-red-600 text-sm">
          An account with this email already exists.{' '}
          <button type="button" onClick={onSwitchToSignIn} className="underline">
            Sign in instead?
          </button>
        </p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg p-3 font-medium disabled:opacity-50"
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
