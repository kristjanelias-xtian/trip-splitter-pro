import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { EventForm } from '@/components/EventForm'
import { SignInButton } from '@/components/auth/SignInButton'
import { CreateEventInput } from '@/types/trip'
import { Card, CardContent } from '@/components/ui/card'
import { LogIn } from 'lucide-react'

export function TripsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createTrip, error } = useTripContext()

  const handleCreate = async (input: CreateEventInput) => {
    const newEvent = await createTrip(input)
    if (!newEvent) {
      throw new Error('Failed to create')
    }
    navigate(`/t/${newEvent.trip_code}/manage`)
  }

  const handleCancel = () => {
    navigate('/')
  }

  const label = 'Create New'

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{label}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set up a new trip or event and get a shareable link
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <LogIn size={48} className="mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sign in to create
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                You need to be signed in to create and manage trips and events.
              </p>
              <div className="flex justify-center">
                <SignInButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{label}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set up a new trip or event and get a shareable link
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
          <EventForm
            onSubmit={handleCreate}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>What happens next:</strong>
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 mt-2">
          <li>• A unique code will be generated (e.g., summer-2025-a3x9k2)</li>
          <li>• You'll be able to add participants</li>
          <li>• Share the link with your group via QR code or direct link</li>
          <li>• Everyone can view and add expenses in real-time</li>
        </ul>
      </div>
    </div>
  )
}
