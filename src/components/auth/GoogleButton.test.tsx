// src/components/auth/GoogleButton.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GoogleButton } from './GoogleButton'

const mockSignInWithOAuth = vi.fn()
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
}))

const mockIsNativePlatform = vi.fn(() => false)
vi.mock('../../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
}))

const mockBrowserOpen = vi.fn()
vi.mock('@capacitor/browser', () => ({
  Browser: { open: (...args: unknown[]) => mockBrowserOpen(...args) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(false)
  mockSignInWithOAuth.mockResolvedValue({ data: { url: null } })
})

describe('GoogleButton', () => {
  it('calls signInWithOAuth with google provider and redirectTo on click (web)', async () => {
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    expect(mockBrowserOpen).not.toHaveBeenCalled()
  })

  it('opens an in-app browser with the OAuth URL on native', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2/auth?client_id=abc' } })
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'moodtrackerplus://auth/callback', skipBrowserRedirect: true },
    })
    expect(mockBrowserOpen).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/auth?client_id=abc' })
  })

  it('does not open a browser on native if no url is returned', async () => {
    mockIsNativePlatform.mockReturnValue(true)
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null } })
    render(<GoogleButton />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(mockBrowserOpen).not.toHaveBeenCalled()
  })
})
