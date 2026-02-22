import { useState, useEffect, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sessionHealthBus } from '@/lib/sessionHealthBus'
import { logger } from '@/lib/logger'

const BACKGROUND_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const EXPIRY_BUFFER_S = 5 * 60 // 5 minutes buffer before actual expiry
const VISIBILITY_DELAY_MS = 2000 // 2s delay after visibility change (Android network reconnect)

function isTokenExpired(session: Session | null): boolean {
  if (!session?.expires_at) return false
  return session.expires_at < Math.floor(Date.now() / 1000) + EXPIRY_BUFFER_S
}

export function useSessionHealth(session: Session | null) {
  const [isExpired, setIsExpired] = useState(false)
  const lastHiddenAt = useRef<number>(0)
  const refreshingRef = useRef(false)

  // Attempt a silent token refresh before showing the overlay.
  // If the refresh succeeds, the user never sees the stale-session overlay.
  // If it fails, we fall through to setIsExpired(true) as before.
  const tryRefreshThenExpire = useCallback(async () => {
    if (!session) return
    if (!isTokenExpired(session)) return

    // Prevent concurrent refresh attempts
    if (refreshingRef.current) return
    refreshingRef.current = true

    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (!error && data.session) {
        logger.info('Session health: silent refresh succeeded — no overlay needed')
        setIsExpired(false)
        return
      }
      logger.warn('Session health: silent refresh failed', { error: String(error) })
    } catch (err) {
      logger.warn('Session health: silent refresh threw', { error: String(err) })
    } finally {
      refreshingRef.current = false
    }

    logger.warn('Session health: token expired and refresh failed — showing overlay', {
      expires_at: session.expires_at,
      now: Math.floor(Date.now() / 1000),
    })
    setIsExpired(true)
  }, [session])

  const refresh = useCallback(() => {
    window.location.reload()
  }, [])

  useEffect(() => {
    if (!session) {
      setIsExpired(false)
      return
    }

    // Check immediately on mount / session change
    if (isTokenExpired(session)) {
      tryRefreshThenExpire()
      return
    }

    // --- Bus listeners ---
    const offAuthError = sessionHealthBus.on('auth-error', () => {
      logger.warn('Session health: auth error detected from API — attempting silent refresh')
      tryRefreshThenExpire()
    })

    const offApiSuccess = sessionHealthBus.on('api-success', () => {
      setIsExpired(false)
    })

    // --- Visibility change ---
    const handleVisibility = () => {
      if (document.hidden) {
        lastHiddenAt.current = Date.now()
        return
      }

      // Tab became visible — check if we were away long enough
      const away = Date.now() - lastHiddenAt.current
      if (away < BACKGROUND_THRESHOLD_MS) return

      // Delay check to let network reconnect (Android)
      setTimeout(() => tryRefreshThenExpire(), VISIBILITY_DELAY_MS)
    }

    // --- Online event ---
    const handleOnline = () => {
      setTimeout(() => tryRefreshThenExpire(), VISIBILITY_DELAY_MS)
    }

    // --- Periodic check ---
    const intervalId = setInterval(() => tryRefreshThenExpire(), CHECK_INTERVAL_MS)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      offAuthError()
      offApiSuccess()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      clearInterval(intervalId)
    }
  }, [session, tryRefreshThenExpire])

  return { isExpired, refresh }
}
