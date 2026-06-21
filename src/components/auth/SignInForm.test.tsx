import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInForm } from './SignInForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SignInForm', () => {
  it('calls signInWithPassword with email and password on submit', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {} as any, error: null })

    render(<SignInForm onForgotPassword={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'secret123',
      })
    })
  })

  it('shows error message on sign-in failure', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {} as any,
      error: { message: 'Invalid login credentials' } as any,
    })

    render(<SignInForm onForgotPassword={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    })
  })

  it('calls onForgotPassword when the link is clicked', async () => {
    const onForgotPassword = vi.fn()
    render(<SignInForm onForgotPassword={onForgotPassword} />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(onForgotPassword).toHaveBeenCalled()
  })
})
