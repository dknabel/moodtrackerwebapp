import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignUpForm } from './SignUpForm'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

async function fillSignUpForm(email: string, password: string, confirm: string) {
  await userEvent.type(screen.getByPlaceholderText(/your@email/i), email)
  await userEvent.type(screen.getByPlaceholderText(/^password$/i), password)
  await userEvent.type(screen.getByPlaceholderText(/^confirm password$/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /create account/i }))
}

describe('SignUpForm', () => {
  it('shows password mismatch error without calling signUp', async () => {
    render(<SignUpForm onSuccess={vi.fn()} />)
    await fillSignUpForm('user@example.com', 'abc123', 'different')
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('calls onSuccess with the email when signUp succeeds', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: {} as any, error: null })
    const onSuccess = vi.fn()
    render(<SignUpForm onSuccess={onSuccess} />)
    await fillSignUpForm('user@example.com', 'secret123', 'secret123')
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('user@example.com')
    })
  })

  it('shows error message on signUp failure', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {} as any,
      error: { message: 'User already registered' } as any,
    })
    render(<SignUpForm onSuccess={vi.fn()} />)
    await fillSignUpForm('user@example.com', 'secret123', 'secret123')
    await waitFor(() => {
      expect(screen.getByText(/user already registered/i)).toBeInTheDocument()
    })
  })
})
