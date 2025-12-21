import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface TripRouteGuardProps {
  children: React.ReactNode
}

/**
 * Route guard that checks if the trip exists
 * If not, redirects to 404 page
 * Shows loading state while trip is being loaded
 */
export function TripRouteGuard({ children }: TripRouteGuardProps) {
  const { currentTrip, tripCode, loading } = useCurrentTrip()
  const navigate = useNavigate()

  useEffect(() => {
    // Only check if trip exists after loading completes
    if (!loading && tripCode && !currentTrip) {
      // Trip code exists in URL but trip not found
      navigate(`/trip-not-found/${tripCode}`, { replace: true })
    }
  }, [loading, currentTrip, tripCode, navigate])

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

  return <>{children}</>
}
