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
  display_name: string | null
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

        // Fetch display_names for linked users (separate query — no direct FK)
        const userIds = [...new Set(
          filtered.filter((p: any) => p.user_id).map((p: any) => p.user_id as string)
        )]
        const displayNameMap = new Map<string, string>()
        if (userIds.length > 0) {
          try {
            const { data: profiles } = await withTimeout<{ data: any[]; error: any }>(
              (supabase as any)
                .from('user_profiles')
                .select('id, display_name')
                .in('id', userIds)
                .abortSignal(controller.signal),
              15000,
              'Loading profiles timed out.'
            )
            if (profiles) {
              for (const p of profiles as any[]) {
                if (p.display_name) displayNameMap.set(p.id, p.display_name)
              }
            }
          } catch {
            // Non-critical — proceed without display names
          }
        }

        // Deduplicate: by user_id first (linked accounts), then email, then name.
        // Keep the record from the most recent trip (by end_date).
        // Prefer records that have a display_name.
        // Merge rule: preserve the best email across records.
        const seen = new Map<string, TripContact>()
        for (const p of filtered as any[]) {
          const key = p.user_id
            ? `uid:${p.user_id}`
            : p.email
              ? `email:${p.email.toLowerCase()}`
              : `name:${p.name.toLowerCase()}`

          const lastSeenAt = tripDateMap.get(p.trip_id) || ''
          const display_name = p.user_id ? displayNameMap.get(p.user_id) ?? null : null

          const existing = seen.get(key)
          const isNewer = !existing || lastSeenAt > existing.lastSeenAt
          const hasNewDisplayName = display_name && !existing?.display_name
          if (isNewer || hasNewDisplayName) {
            const bestEmail = p.email ?? existing?.email ?? null
            seen.set(key, {
              name: p.name,
              email: bestEmail,
              user_id: p.user_id ?? null,
              display_name,
              lastSeenAt: isNewer ? lastSeenAt : existing!.lastSeenAt,
            })
          }
        }

        // Post-pass: merge entries that share the same email but got different keys
        // (e.g. uid:X from one trip + email:Y from another trip for the same person)
        const emailToKey = new Map<string, string>()
        for (const [key, contact] of seen) {
          if (!contact.email) continue
          const emailLower = contact.email.toLowerCase()
          const existingKey = emailToKey.get(emailLower)
          if (existingKey && existingKey !== key) {
            const keepKey = key.startsWith('uid:') ? key : existingKey
            const removeKey = key.startsWith('uid:') ? existingKey : key
            const keepEntry = seen.get(keepKey)!
            const removeEntry = seen.get(removeKey)!
            keepEntry.email = keepEntry.email ?? removeEntry.email
            if (removeEntry.lastSeenAt > keepEntry.lastSeenAt) {
              keepEntry.lastSeenAt = removeEntry.lastSeenAt
            }
            if (removeEntry.display_name && !keepEntry.display_name) {
              keepEntry.display_name = removeEntry.display_name
            }
            seen.delete(removeKey)
            emailToKey.set(emailLower, keepKey)
          } else {
            emailToKey.set(emailLower, key)
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
