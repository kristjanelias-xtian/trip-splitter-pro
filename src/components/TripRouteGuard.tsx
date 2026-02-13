import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { useTripContext } from '@/contexts/TripContext'
import { LinkParticipantDialog } from '@/components/LinkParticipantDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, UserCheck, AlertCircle, RefreshCw } from 'lucide-react'

interface TripRouteGuardProps {
  children: React.ReactNode
}

/**
 * Route guard that checks if the trip exists
 * If not, redirects to 404 page
 * Shows loading state while trip is being loaded
 * Shows error state with retry if fetch fails
 * Shows link participant banner for authenticated users who haven't linked
 */
export function TripRouteGuard({ children }: TripRouteGuardProps) {
  const { currentTrip, tripCode, loading } = useCurrentTrip()
  const { user } = useAuth()
  const { isLinked } = useMyParticipant()
  const { error, refreshTrips } = useTripContext()
  const navigate = useNavigate()

  useEffect(() => {
    // Only check if trip exists after loading completes without errors
    if (!loading && !error && tripCode && !currentTrip) {
      // Trip code exists in URL but trip not found
      navigate(`/trip-not-found/${tripCode}`, { replace: true })
    }
  }, [loading, error, currentTrip, tripCode, navigate])

  // Show loading while trips are being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading trip...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error with retry button if fetch failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="font-medium text-foreground">Failed to load trip</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button onClick={refreshTrips} variant="outline" className="gap-2">
                <RefreshCw size={16} />
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {user && !isLinked && (
        <div className="mb-4 p-3 rounded-lg border border-border bg-accent/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck size={16} />
            <span>Link yourself to a participant to unlock Quick Mode features</span>
          </div>
          <LinkParticipantDialog />
        </div>
      )}
      {children}
    </>
  )
}
