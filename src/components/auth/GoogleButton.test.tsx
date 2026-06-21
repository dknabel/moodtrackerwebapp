import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleButton } from './GoogleButton'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

describe('GoogleButton', () => {
  it('calls signInWithOAuth with google provider and redirectTo on click', async () => {
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })
})
