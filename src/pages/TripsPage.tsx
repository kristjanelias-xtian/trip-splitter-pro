import { useNavigate } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { TripForm } from '@/components/TripForm'
import { CreateTripInput } from '@/types/trip'
import { Card, CardContent } from '@/components/ui/card'

export function TripsPage() {
  const navigate = useNavigate()
  const { createTrip, error } = useTripContext()

  const handleCreateTrip = async (input: CreateTripInput) => {
    const newTrip = await createTrip(input)
    if (newTrip) {
      // Navigate to manage page for new trip using trip code
      navigate(`/t/${newTrip.trip_code}/manage`)
    }
  }

  const handleCancel = () => {
    // Go back to home page
    navigate('/')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Create New Trip</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set up a new trip and get a shareable link
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <TripForm
            onSubmit={handleCreateTrip}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>What happens next:</strong>
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
          <li>• A unique trip code will be generated (e.g., summer-2025-a3x9k2)</li>
          <li>• You'll be able to add participants to your trip</li>
          <li>• Share the trip link with your group via QR code or direct link</li>
          <li>• Everyone can view and add expenses in real-time</li>
        </ul>
      </div>
    </div>
  )
}
