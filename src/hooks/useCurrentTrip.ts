import { useParams } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'

export function useCurrentTrip() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const { getTripByCode, trips } = useTripContext()

  const currentTrip = tripCode ? getTripByCode(tripCode) : null

  console.log('useCurrentTrip:', { tripCode, currentTrip, tripsCount: trips.length })

  return {
    currentTrip,
    tripCode,
  }
}
