import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginPage', () => {
  it('shows confirmation message after sending magic link', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: {}, error: null } as any)

    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send link/i }))

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('shows error message when sending fails', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: {},
      error: { message: 'Rate limit exceeded' },
    } as any)

    render(<LoginPage />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send link/i }))

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
    })
  })
})
