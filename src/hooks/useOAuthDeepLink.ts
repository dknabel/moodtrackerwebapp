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
      const params = new URLSearchParams(new URL(url).hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (!access_token || !refresh_token) return
      void supabase.auth.setSession({ access_token, refresh_token })
    }).then(handle => {
      listener = handle
    })
    return () => { listener?.remove() }
  }, [])
}
