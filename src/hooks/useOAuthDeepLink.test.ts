import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockAddListener = vi.fn(() => Promise.resolve({ remove: vi.fn() }))
vi.mock('@capacitor/app', () => ({
  App: { addListener: (...args: unknown[]) => mockAddListener(...args) },
}))

const mockBrowserClose = vi.fn()
vi.mock('@capacitor/browser', () => ({
  Browser: { close: (...args: unknown[]) => mockBrowserClose(...args) },
}))

const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args) } },
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

  it('closes the browser and exchanges the code when the callback URL is opened', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'moodtrackerplus://auth/callback?code=abc123' })

    expect(mockBrowserClose).toHaveBeenCalled()
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('moodtrackerplus://auth/callback?code=abc123')
  })

  it('ignores URLs that do not match the callback prefix', () => {
    renderHook(() => useOAuthDeepLink())
    const handler = mockAddListener.mock.calls[0][1] as (data: { url: string }) => void
    handler({ url: 'someotherapp://something' })

    expect(mockBrowserClose).not.toHaveBeenCalled()
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })
})
