import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Trash2, Share2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getMyTrips, removeFromMyTrips, type MyTripEntry } from '@/lib/myTripsStorage'
import { getHiddenTripCodes, showTrip } from '@/lib/mutedTripsStorage'
import { getActiveTripId } from '@/lib/activeTripDetection'
import { ShareTripDialog } from '@/components/ShareTripDialog'
import { OnboardingPrompts } from '@/components/OnboardingPrompts'
import { TripCard } from '@/components/TripCard'
import { GroupActions } from '@/components/quick/GroupActions'
import { PageLoadingState } from '@/components/PageLoadingState'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { useMyTripBalances } from '@/hooks/useMyTripBalances'
import { ChevronDown, Eye } from 'lucide-react'

export function HomePage() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { loading: tripsLoading } = useTripContext()
  const { tripBalances, loading: balancesLoading } = useMyTripBalances()
  const [localTrips, setLocalTrips] = useState<MyTripEntry[]>([])
  const [hiddenCodes, setHiddenCodes] = useState(() => new Set(getHiddenTripCodes()))
  const [showHidden, setShowHidden] = useState(false)

  const isAuthenticated = !!user
  const loading = isAuthenticated && (balancesLoading || tripsLoading)
  const firstName = userProfile?.display_name?.split(' ')[0] || 'there'

  useEffect(() => {
    if (!isAuthenticated) {
      setLocalTrips(getMyTrips())
    }
  }, [isAuthenticated])

  const visibleTrips = tripBalances.filter(tb => !hiddenCodes.has(tb.trip.trip_code))
  const hiddenTrips = tripBalances.filter(tb => hiddenCodes.has(tb.trip.trip_code))

  const activeTripId = useMemo(
    () => getActiveTripId(visibleTrips.map(tb => tb.trip)),
    [visibleTrips]
  )

  const handleHidden = useCallback((tripCode: string) => {
    setHiddenCodes(prev => new Set([...prev, tripCode]))
  }, [])

  const handleShow = useCallback((tripCode: string) => {
    showTrip(tripCode)
    setHiddenCodes(prev => {
      const next = new Set(prev)
      next.delete(tripCode)
      return next
    })
  }, [])

  const handleLeft = useCallback((tripCode: string) => {
    setHiddenCodes(prev => new Set([...prev, tripCode]))
  }, [])

  const handleCreateTrip = () => {
    navigate('/create-trip')
  }

  const handleOpenTrip = (tripCode: string) => {
    navigate(`/t/${tripCode}/dashboard`)
  }

  const handleRemoveLocalTrip = (tripCode: string, tripName: string) => {
    if (confirm(`Remove "${tripName}" from My Trips?\n\nThis won't delete the trip, you can access it again via the share link.`)) {
      removeFromMyTrips(tripCode)
      setLocalTrips(getMyTrips())
    }
  }

  // Empty state shared by both views
  const renderEmptyState = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nothing yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Create a new trip or event, or access one via a shared link
          </p>
          <Button onClick={handleCreateTrip} variant="outline" className="gap-2">
            <Plus size={18} />
            Create Your First
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Authenticated view: TripCard with balances
  const renderAuthenticatedTrips = () => {
    if (loading) {
      return <PageLoadingState />
    }

    if (visibleTrips.length === 0) {
      return renderEmptyState()
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleTrips.map(({ trip, myBalance }) => (
            <TripCard
              key={trip.id}
              trip={trip}
              balance={myBalance}
              isActive={trip.id === activeTripId}
              onClick={() => handleOpenTrip(trip.trip_code)}
              actions={
                <GroupActions
                  tripCode={trip.trip_code}
                  tripName={trip.name}
                  onHidden={() => handleHidden(trip.trip_code)}
                  onLeft={() => handleLeft(trip.trip_code)}
                />
              }
            />
          ))}
        </div>

        {/* Hidden trips section */}
        {hiddenTrips.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowHidden(prev => !prev)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <ChevronDown
                size={16}
                className={`transition-transform ${showHidden ? 'rotate-180' : ''}`}
              />
              {hiddenTrips.length} hidden {hiddenTrips.length === 1 ? 'group' : 'groups'}
            </button>

            {showHidden && (
              <div className="mt-3 space-y-2">
                {hiddenTrips.map(({ trip }) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-muted/30"
                  >
                    <span className="text-sm text-muted-foreground truncate">
                      {trip.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground flex-shrink-0"
                      onClick={() => handleShow(trip.trip_code)}
                    >
                      <Eye size={14} />
                      Show
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  // Anonymous view: localStorage trips
  const renderLocalTrips = () => {
    if (localTrips.length === 0) {
      return renderEmptyState()
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {localTrips.map(trip => (
          <Card
            key={trip.tripCode}
            className="overflow-hidden"
          >
            <div
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => handleOpenTrip(trip.tripCode)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {trip.tripName}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Calendar size={12} />
                      <span>
                        Last opened {new Date(trip.lastAccessed).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <ShareTripDialog
                      tripCode={trip.tripCode}
                      tripName={trip.tripName}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 size={14} className="text-muted-foreground" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveLocalTrip(trip.tripCode, trip.tripName)
                      }}
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header — personal greeting or generic */}
        <div className="mb-8">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.display_name}
                  className="w-12 h-12 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Hi, {firstName}
                </h1>
                <p className="text-sm text-muted-foreground">Your events & trips</p>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-foreground">
              Events & Trips
            </h1>
          )}
        </div>

        <OnboardingPrompts />

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <Button onClick={handleCreateTrip} className="gap-2">
            <Plus size={18} />
            Create New
          </Button>
        </div>

        {/* Trips List */}
        <div>
          {isAuthenticated ? renderAuthenticatedTrips() : renderLocalTrips()}
        </div>
      </div>
    </div>
  )
}
