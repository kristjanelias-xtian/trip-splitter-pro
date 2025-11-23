import { useParams } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'

export function useCurrentTrip() {
  const { tripId } = useParams<{ tripId: string }>()
  const { getTripById } = useTripContext()

  const currentTrip = tripId ? getTripById(tripId) : null

  return {
    currentTrip,
    tripId,
  }
}
