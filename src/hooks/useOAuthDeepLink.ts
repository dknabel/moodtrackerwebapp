import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'
import { isNativePlatform } from '../lib/notifications'

const CALLBACK_PREFIX = 'moodtrackerplus://auth/callback'

export function useOAuthDeepLink(): void {
  useEffect(() => {
    if (!isNativePlatform()) return

    let listener: { remove: () => void } | null = null
    void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      if (!url.startsWith(CALLBACK_PREFIX)) return
      void Browser.close()
      void supabase.auth.exchangeCodeForSession(url)
    }).then(handle => {
      listener = handle
    })
    return () => { listener?.remove() }
  }, [])
}
