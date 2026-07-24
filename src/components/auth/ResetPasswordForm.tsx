import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btnPrimary } from '../../lib/styles'

interface Props {
  onExpiredLink: () => void
}

export function ResetPasswordForm({ onExpiredLink }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('expired')) {
        setError('link-expired')
      } else {
        setError(error.message)
      }
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 max-w-sm text-center">
        <p className="text-ink text-sm">
          Password updated. You're now signed in.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${btnPrimary} w-full`}
        >
          Continue to app
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <p className="text-muted text-sm text-center">Choose a new password</p>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="New password"
        required
        className="border border-line bg-surface text-ink placeholder-faint rounded-lg p-3 text-base"
      />
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        required
        className="border border-line bg-surface text-ink placeholder-faint rounded-lg p-3 text-base"
      />
      {error === 'link-expired' ? (
        <p className="text-red-600 text-sm text-center">
          This link has expired.{' '}
          <button type="button" onClick={onExpiredLink} className="underline">
            Request a new one
          </button>
        </p>
      ) : error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className={`${btnPrimary} w-full`}
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
