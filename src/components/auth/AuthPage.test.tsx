import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthPage } from './AuthPage'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'
import { AuthError } from '@supabase/supabase-js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthPage', () => {
  it('shows sign-in form and Google button by default', () => {
    render(<AuthPage />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('switches to sign-up mode when "Sign up" is clicked', async () => {
    render(<AuthPage />)
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('switches back to sign-in from sign-up', async () => {
    render(<AuthPage initialMode="sign-up" />)
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument()
  })

  it('switches to forgot-password mode when "Forgot password?" is clicked', async () => {
    render(<AuthPage />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('switches back to sign-in from forgot-password', async () => {
    render(<AuthPage initialMode="forgot-password" />)
    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('shows verify-email notice after successful sign-up', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: null, session: null }, error: null })
    render(<AuthPage initialMode="sign-up" />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secret123')
    await userEvent.type(screen.getByPlaceholderText(/^confirm password$/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument()
    })
  })

  it('shows reset-password form when initialMode is reset-password', () => {
    render(<AuthPage initialMode="reset-password" />)
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in with google/i })).not.toBeInTheDocument()
  })

  it('switches to sign-in mode when SignUpForm fires onSwitchToSignIn', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError('User already registered'),
    })
    render(<AuthPage initialMode="sign-up" />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'taken@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secret123')
    await userEvent.type(screen.getByPlaceholderText(/^confirm password$/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in instead/i })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: /sign in instead/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument()
    })
  })

  it('switches to forgot-password mode when ResetPasswordForm fires onExpiredLink', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: new AuthError('Token has expired or is invalid'),
    })
    render(<AuthPage initialMode="reset-password" />)
    await userEvent.type(screen.getByPlaceholderText(/^new password$/i), 'newpass123')
    await userEvent.type(screen.getByPlaceholderText(/^confirm new password$/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request a new one/i })).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole('button', { name: /request a new one/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    })
  })
})
