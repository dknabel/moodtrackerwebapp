import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockAddListener = vi.fn<(...args: unknown[]) => Promise<{ remove: () => void }>>(() =>
  Promise.resolve({ remove: vi.fn() })
)
vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => mockAddListener(...args) },
}))

const mockBrowserClose = vi.fn()
vi.mock('@capacitor/browser', () => ({
  Browser: { close: (...args: unknown[]) => mockBrowserClose(...args) },
}))

const mockSetSession = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { setSession: (...args: unknown[]) => mockSetSession(...args) } },
}))

const mockIsNativePlatform = vi.fn(() => true)
vi.mock('../lib/notifications', () => ({
  isNativePlatform: () => mockIsNativePlatform(),
}))

import { useOAuthDeepLink } from './useOAuthDeepLink'

beforeEach(() => {
  vi.clearAllMocks()
  mockIsNativePlatform.mockReturnValue(true)
})

describe('useOAuthDeepLink', () => {
  it('does not register a listener when not on a native platform', () => {
    mockIsNativePlatform.mockReturnValue(false)
    renderHook(() => useOAuthDeepLink())
    expect(mockAddListener).not.toHaveBeenCalled()
  })

  it('registers an appUrlOpen listener when native', () => {
    renderHook(() => useOAuthDeepLink())
    expect(mockAddListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function))
  })

  it('closes the browser and sets the session from the access/refresh tokens in the callback URL fragment', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'moodtrackerplus://auth/callback#access_token=tok123&refresh_token=ref456&expires_in=3600&token_type=bearer' })

    expect(mockBrowserClose).toHaveBeenCalled()
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'tok123', refresh_token: 'ref456' })
  })

  it('ignores URLs that do not match the callback prefix', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'someotherapp://something' })

    expect(mockBrowserClose).not.toHaveBeenCalled()
    expect(mockSetSession).not.toHaveBeenCalled()
  })

  it('closes the browser but does not set a session when the callback has no tokens (e.g. a denied/cancelled login)', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'moodtrackerplus://auth/callback?error=access_denied' })

    expect(mockBrowserClose).toHaveBeenCalled()
    expect(mockSetSession).not.toHaveBeenCalled()
  })
})
