import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResetPasswordForm } from './ResetPasswordForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'
import { AuthError, type User } from '@supabase/supabase-js'

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillResetForm(password: string, confirm: string) {
  await userEvent.type(screen.getByPlaceholderText(/^new password$/i), password)
  await userEvent.type(screen.getByPlaceholderText(/^confirm new password$/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /update password/i }))
}

describe('ResetPasswordForm', () => {
  it('shows mismatch error without calling updateUser', async () => {
    render(<ResetPasswordForm onExpiredLink={vi.fn()} />)
    await fillResetForm('abc123', 'different')
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with new password and shows success message on match', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: {} as User }, error: null })
    render(<ResetPasswordForm onExpiredLink={vi.fn()} />)
    await fillResetForm('newpass123', 'newpass123')
    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument()
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('shows error message on updateUser failure', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new AuthError('Password is too weak'),
    })
    render(<ResetPasswordForm onExpiredLink={vi.fn()} />)
    await fillResetForm('abc', 'abc')
    await waitFor(() => {
      expect(screen.getByText(/password is too weak/i)).toBeInTheDocument()
    })
  })

  it('shows Continue to app button after successful update', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: { user: {} as User }, error: null })
    render(<ResetPasswordForm onExpiredLink={vi.fn()} />)
    await fillResetForm('newpass123', 'newpass123')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continue to app/i })).toBeInTheDocument()
    })
  })

  it('shows expired-link message with request-new-one link when token is expired', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new AuthError('Token has expired or is invalid'),
    })
    const onExpiredLink = vi.fn()
    render(<ResetPasswordForm onExpiredLink={onExpiredLink} />)
    await fillResetForm('newpass123', 'newpass123')
    await waitFor(() => {
      expect(screen.getByText(/this link has expired/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /request a new one/i })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: /request a new one/i }))
    expect(onExpiredLink).toHaveBeenCalled()
  })

  it('shows raw error message when error is invalid but not expired', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new AuthError('Invalid password: must be at least 8 characters'),
    })
    render(<ResetPasswordForm onExpiredLink={vi.fn()} />)
    await fillResetForm('ab', 'ab')
    await waitFor(() => {
      expect(screen.getByText(/invalid password/i)).toBeInTheDocument()
      expect(screen.queryByText(/this link has expired/i)).not.toBeInTheDocument()
    })
  })
})
