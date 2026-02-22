import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { calculateBalances, ParticipantBalance } from '@/services/balanceCalculator'
import { Trip } from '@/types/trip'
import { Participant, Family } from '@/types/participant'
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
            const [participantsRes, familiesRes, expensesRes, settlementsRes] = await Promise.all([
              withTimeout(
                supabase.from('participants').select('*').eq('trip_id', trip.id),
                15000,
                `Loading participants for trip timed out`
              ),
              withTimeout(
                supabase.from('families').select('*').eq('trip_id', trip.id),
                15000,
                `Loading families for trip timed out`
              ),
              withTimeout(
                supabase.from('expenses').select('*').eq('trip_id', trip.id),
                15000,
                `Loading expenses for trip timed out`
              ),
              withTimeout(
                supabase.from('settlements').select('*').eq('trip_id', trip.id),
                15000,
                `Loading settlements for trip timed out`
              ),
            ])

            const participants = (participantsRes.data as Participant[]) || []
            const families = (familiesRes.data as Family[]) || []
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
              families,
              trip.tracking_mode,
              settlements,
              trip.default_currency,
              trip.exchange_rates
            )

            // Find the user's balance entity
            // In families mode, if user is in a family, find the family balance
            let myBalance: ParticipantBalance | null = null
            if (trip.tracking_mode === 'families' && myParticipant.family_id) {
              myBalance = calc.balances.find(b => b.id === myParticipant.family_id) || null
            } else {
              myBalance = calc.balances.find(b => b.id === myParticipant.id) || null
            }

            return { trip, myBalance, totalExpenses: calc.totalExpenses, loading: false }
          } catch (error) {
            console.error(`Error fetching balance for trip ${trip.id}:`, error)
            return { trip, myBalance: null, totalExpenses: 0, loading: false }
          }
        })
      )

      setTripBalances(balances)
      setLoading(false)
    }

    fetchBalances()
  }, [user, trips])

  return { tripBalances, loading }
}
