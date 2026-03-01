import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { logger } from '@/lib/logger'

export interface TripContact {
  name: string
  email: string | null
  user_id: string | null
  lastSeenAt: string
}

/**
 * Fetches deduplicated contacts from the current user's other trips.
 * Returns people the user has "tripped with" before — useful for
 * autocomplete when adding participants to a new trip.
 *
 * Only runs for authenticated users. Returns empty array otherwise.
 */
export function useTripContacts(currentTripId: string | undefined) {
  const { user } = useAuth()
  const { trips } = useTripContext()
  const [contacts, setContacts] = useState<TripContact[]>([])
  const [loading, setLoading] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false

    if (!user || !currentTripId || trips.length === 0) {
      setContacts([])
      return
    }

    const otherTrips = trips.filter(t => t.id !== currentTripId)
    const otherTripIds = otherTrips.map(t => t.id)

    if (otherTripIds.length === 0) {
      setContacts([])
      return
    }

    // Build trip date map for lastSeenAt (use end_date as proxy)
    const tripDateMap = new Map<string, string>()
    for (const t of otherTrips) {
      tripDateMap.set(t.id, t.end_date || t.start_date)
    }

    const controller = new AbortController()

    const fetchContacts = async () => {
      setLoading(true)
      try {
        const { data, error } = await withTimeout(
          supabase
            .from('participants')
            .select('name, email, user_id, trip_id')
            .in('trip_id', otherTripIds)
            .limit(200)
            .abortSignal(controller.signal),
          15000,
          'Loading contacts timed out.'
        )

        if (cancelledRef.current) return

        if (error) {
          logger.warn('Failed to fetch trip contacts', { error: error.message })
          setLoading(false)
          return
        }

        if (!data || data.length === 0) {
          setContacts([])
          setLoading(false)
          return
        }

        // Filter out self
        const filtered = data.filter(
          (p: any) => p.user_id !== user.id
        )

        // Deduplicate: by email (lowercase) if exists, else by exact name (lowercase).
        // Keep the record from the most recent trip (by end_date).
        const seen = new Map<string, TripContact>()
        for (const p of filtered as any[]) {
          const key = p.email
            ? `email:${p.email.toLowerCase()}`
            : `name:${p.name.toLowerCase()}`

          const lastSeenAt = tripDateMap.get(p.trip_id) || ''

          const existing = seen.get(key)
          if (!existing || lastSeenAt > existing.lastSeenAt) {
            seen.set(key, {
              name: p.name,
              email: p.email ?? null,
              user_id: p.user_id ?? null,
              lastSeenAt,
            })
          }
        }

        // Sort by lastSeenAt descending (most recently tripped with first)
        const sorted = Array.from(seen.values()).sort(
          (a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)
        )

        if (!cancelledRef.current) {
          setContacts(sorted)
        }
      } catch (err) {
        if (cancelledRef.current) return
        logger.warn('Unhandled error fetching trip contacts', {
          error: String(err),
        })
      } finally {
        if (!cancelledRef.current) {
          setLoading(false)
        }
      }
    }

    fetchContacts()

    return () => {
      cancelledRef.current = true
      controller.abort()
    }
  }, [user?.id, currentTripId, trips.length])

  return { contacts, loading }
}
