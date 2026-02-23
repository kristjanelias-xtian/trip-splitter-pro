import { useState, useEffect, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sessionHealthBus } from '@/lib/sessionHealthBus'
import { logger } from '@/lib/logger'
import { debugLog } from '@/lib/debugLogger'

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
  const lastRefreshAttemptRef = useRef<number>(0)

  // Attempt a silent token refresh before showing the overlay.
  // If the refresh succeeds, the user never sees the stale-session overlay.
  // If it fails, we fall through to setIsExpired(true) as before.
  //
  // Safety: This calls supabase.auth.refreshSession() which acquires the auth
  // lock and fires _notifyAllSubscribers('TOKEN_REFRESHED'). The AuthContext
  // subscriber is now synchronous (no awaited DB queries) so the lock releases
  // cleanly. The refreshingRef guard prevents concurrent calls from this hook,
  // and Supabase's internal refreshingDeferred deduplicates at the network level.
  const tryRefreshThenExpire = useCallback(async () => {
    if (!session) return
    if (!isTokenExpired(session)) return

    // Cooldown: at most one refresh attempt per 30 seconds
    const now = Date.now()
    if (now - lastRefreshAttemptRef.current < 30_000) {
      logger.info('Session health: refresh cooldown active — skipping', {
        msUntilNextAllowed: 30_000 - (now - lastRefreshAttemptRef.current),
      })
      return
    }
    lastRefreshAttemptRef.current = now

    // Prevent concurrent refresh attempts
    if (refreshingRef.current) return
    refreshingRef.current = true

    try {
      debugLog.auth('refreshSession:start', { expiresAt: session.expires_at })
      const startMs = Date.now()
      const { data, error } = await supabase.auth.refreshSession()
      const durationMs = Date.now() - startMs
      if (!error && data.session) {
        debugLog.auth('refreshSession:success', { durationMs, newExpiresAt: data.session.expires_at })
        logger.info('Session health: silent refresh succeeded — no overlay needed')
        setIsExpired(false)
        return
      }
      debugLog.auth('refreshSession:failed', { durationMs, error: String(error) })
      logger.warn('Session health: silent refresh failed', { error: String(error) })
    } catch (err) {
      debugLog.auth('refreshSession:threw', { error: String(err) })
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

    // Guard against firing setTimeout callbacks after unmount
    const isMounted = { current: true }

    // --- Bus listeners ---
    const offAuthError = sessionHealthBus.on('auth-error', () => {
      if (!session) return
      if (!isTokenExpired(session)) {
        logger.warn('Session health: 401 received but token not expired — skipping refresh', {
          expires_at: session.expires_at,
          now: Math.floor(Date.now() / 1000),
        })
        return
      }
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
      setTimeout(() => {
        if (isMounted.current) tryRefreshThenExpire()
      }, VISIBILITY_DELAY_MS)
    }

    // --- Online event ---
    const handleOnline = () => {
      setTimeout(() => {
        if (isMounted.current) tryRefreshThenExpire()
      }, VISIBILITY_DELAY_MS)
    }

    // --- Periodic check ---
    const intervalId = setInterval(() => tryRefreshThenExpire(), CHECK_INTERVAL_MS)

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      isMounted.current = false
      offAuthError()
      offApiSuccess()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      clearInterval(intervalId)
    }
  }, [session, tryRefreshThenExpire])

  return { isExpired, refresh }
}
