import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { calculateBalances, buildEntityMap, ParticipantBalance } from '@/services/balanceCalculator'
import { Trip } from '@/types/trip'
import { Participant } from '@/types/participant'
import { Expense } from '@/types/expense'
import { Settlement } from '@/types/settlement'

export interface TripBalance {
  trip: Trip
  myBalance: ParticipantBalance | null
  totalExpenses: number
  loading: boolean
}

/**
 * Fetches data for each "My Trip" and computes the user's personal balance.
 * Only works for authenticated users who have linked themselves to participants.
 */
export function useMyTripBalances() {
  const { user } = useAuth()
  const { trips } = useTripContext()
  const [tripBalances, setTripBalances] = useState<TripBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || trips.length === 0) {
      setTripBalances([])
      setLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const fetchBalances = async () => {
      setLoading(true)

      // Deduplicate trips by ID (safety guard against duplicates)
      const uniqueTrips = trips.filter((trip, index, self) =>
        index === self.findIndex(t => t.id === trip.id)
      )

      // TripContext already returns only user's trips when authenticated; use directly.
      const balances: TripBalance[] = await Promise.all(
        uniqueTrips.map(async (trip) => {
          try {
            // Parallel fetch all data for this trip
            const [participantsRes, expensesRes, settlementsRes] = await Promise.all([
              withTimeout(
                supabase.from('participants').select('*').eq('trip_id', trip.id).abortSignal(controller.signal),
                15000,
                `Loading participants for trip timed out`
              ),
              withTimeout(
                supabase.from('expenses').select('*').eq('trip_id', trip.id).abortSignal(controller.signal),
                15000,
                `Loading expenses for trip timed out`
              ),
              withTimeout(
                supabase.from('settlements').select('*').eq('trip_id', trip.id).abortSignal(controller.signal),
                15000,
                `Loading settlements for trip timed out`
              ),
            ])

            if (cancelled) return { trip, myBalance: null, totalExpenses: 0, loading: false }

            const participants = (participantsRes.data as Participant[]) || []
            const expenses = (expensesRes.data as unknown as Expense[]) || []
            const settlements = (settlementsRes.data as Settlement[]) || []

            // Find user's participant in this trip
            const myParticipant = participants.find(p => p.user_id === user.id)

            if (!myParticipant) {
              return { trip, myBalance: null, totalExpenses: 0, loading: false }
            }

            // Calculate balances (with currency conversion)
            const calc = calculateBalances(
              expenses,
              participants,
              trip.tracking_mode,
              settlements,
              trip.default_currency,
              trip.exchange_rates
            )

            // Find the user's balance entity via entity map
            const entityMap = buildEntityMap(participants, trip.tracking_mode)
            const myEntityId = entityMap.participantToEntityId.get(myParticipant.id) ?? myParticipant.id
            const myBalance = calc.balances.find(b => b.id === myEntityId) || null

            return { trip, myBalance, totalExpenses: calc.totalExpenses, loading: false }
          } catch (error) {
            if (cancelled) return { trip, myBalance: null, totalExpenses: 0, loading: false }
            console.error(`Error fetching balance for trip ${trip.id}:`, error)
            return { trip, myBalance: null, totalExpenses: 0, loading: false }
          }
        })
      )

      if (!cancelled) {
        setTripBalances(balances)
        setLoading(false)
      }
    }

    fetchBalances()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [user, trips])

  return { tripBalances, loading }
}
