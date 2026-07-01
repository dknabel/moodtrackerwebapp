import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForgotPasswordForm } from './ForgotPasswordForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'
import { AuthError } from '@supabase/supabase-js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ForgotPasswordForm', () => {
  it('calls resetPasswordForEmail with redirectTo and shows confirmation on success', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null })

    render(<ForgotPasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument()
    })
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      { redirectTo: window.location.origin }
    )
  })

  it('shows error message on failure', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: null,
      error: new AuthError('Email not found'),
    })

    render(<ForgotPasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'nobody@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/email not found/i)).toBeInTheDocument()
    })
  })
})
