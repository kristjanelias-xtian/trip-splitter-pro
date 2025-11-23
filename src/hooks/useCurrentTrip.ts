import { useParams } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'

export function useCurrentTrip() {
  const { tripId } = useParams<{ tripId: string }>()
  const { getTripById, trips } = useTripContext()

  const currentTrip = tripId ? getTripById(tripId) : null

  console.log('useCurrentTrip:', { tripId, currentTrip, tripsCount: trips.length })

  return {
    currentTrip,
    tripId,
  }
}
