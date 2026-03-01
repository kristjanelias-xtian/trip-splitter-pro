import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRegisterRefresh } from '@/hooks/useRegisterRefresh'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Trash2, Share2, ChevronRight, ScanLine, ChevronDown, Eye, ExternalLink, Sparkles } from 'lucide-react'
import { InstallGuide } from '@/components/InstallGuide'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getMyTrips, removeFromMyTrips, type MyTripEntry } from '@/lib/myTripsStorage'
import { getHiddenTripCodes, showTrip } from '@/lib/mutedTripsStorage'
import { getActiveTripId } from '@/lib/activeTripDetection'
import { ShareTripDialog } from '@/components/ShareTripDialog'
import { OnboardingPrompts } from '@/components/OnboardingPrompts'
import { TripCard } from '@/components/TripCard'
import { GroupActions } from '@/components/quick/GroupActions'
import { QuickCreateSheet } from '@/components/quick/QuickCreateSheet'
import { QuickScanContextSheet } from '@/components/quick/QuickScanContextSheet'
import { QuickScanCreateFlow } from '@/components/quick/QuickScanCreateFlow'
import { PageLoadingState } from '@/components/PageLoadingState'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { useMyTripBalances } from '@/hooks/useMyTripBalances'
import { motion } from 'framer-motion'

const DEMO_TRIP_CODE = 'livigno-2025'

export function HomePage() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { loading: tripsLoading, refreshTrips } = useTripContext()
  const { mode } = useUserPreferences()
  const { tripBalances, loading: balancesLoading } = useMyTripBalances()
  const [localTrips, setLocalTrips] = useState<MyTripEntry[]>([])
  const [hiddenCodes, setHiddenCodes] = useState(() => new Set(getHiddenTripCodes()))
  const [showHidden, setShowHidden] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [scanContextOpen, setScanContextOpen] = useState(false)
  const [scanCreateOpen, setScanCreateOpen] = useState(false)
  const { shouldShowPrompt, dismiss: dismissInstall, incrementVisit } = usePWAInstall()

  const handleRefresh = useCallback(async () => { await refreshTrips() }, [refreshTrips])
  useRegisterRefresh(handleRefresh)

  const isAuthenticated = !!user
  const loading = isAuthenticated && (balancesLoading || tripsLoading)
  const firstName = userProfile?.display_name?.split(' ')[0] || 'there'

  useEffect(() => {
    if (!isAuthenticated) {
      setLocalTrips(getMyTrips())
    }
  }, [isAuthenticated])

  useEffect(() => {
    incrementVisit()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isAuthenticated) {
      setCreateOpen(true)
    } else {
      navigate('/create-trip')
    }
  }

  const handleOpenTrip = (tripCode: string) => {
    navigate(mode === 'quick' ? `/t/${tripCode}/quick` : `/t/${tripCode}/dashboard`)
  }

  const handleScanTap = () => {
    if (loading) return
    if (visibleTrips.length === 0) {
      setScanCreateOpen(true)
    } else {
      setScanContextOpen(true)
    }
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
          <div className="mt-3">
            <button
              onClick={() => navigate(`/t/${DEMO_TRIP_CODE}`)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles size={14} />
              Try a demo
            </button>
          </div>
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
          {visibleTrips.map(({ trip, myBalance }, i) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <TripCard
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
            </motion.div>
          ))}
        </div>

        {/* Create trip button */}
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={handleCreateTrip} className="gap-2">
            <Plus size={16} />
            New Trip or Event
          </Button>
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

        {shouldShowPrompt && (
          <InstallGuide variant="banner" onDismiss={dismissInstall} />
        )}

        <OnboardingPrompts />

        {/* Scan CTA — authenticated users only */}
        {isAuthenticated && (
          <button
            onClick={handleScanTap}
            disabled={loading}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all mb-6 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <ScanLine size={20} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm leading-tight">Scan a Receipt</p>
                <p className="text-xs text-primary-foreground/70 mt-0.5">
                  {visibleTrips.length === 0 ? 'Creates a new group automatically' : 'Add expenses from a photo'}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="opacity-70" />
          </button>
        )}

        {/* Demo link — authenticated users with no trips */}
        {isAuthenticated && !loading && visibleTrips.length === 0 && (
          <div className="text-center -mt-3 mb-6">
            <button
              onClick={() => navigate(`/t/${DEMO_TRIP_CODE}`)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles size={14} />
              Try a demo
            </button>
          </div>
        )}

        {/* Action Buttons — unauthenticated only (authenticated uses sheet + scan CTA) */}
        {!isAuthenticated && (
          <div className="flex gap-3 mb-8">
            <Button onClick={handleCreateTrip} className="gap-2">
              <Plus size={18} />
              Create New
            </Button>
          </div>
        )}

        {/* Trips List */}
        <div>
          {isAuthenticated ? renderAuthenticatedTrips() : renderLocalTrips()}
        </div>

        {/* What's New link */}
        {isAuthenticated && (
          <div className="mt-8 text-center">
            <a
              href="https://github.com/kristjanelias-xtian/trip-splitter-pro/blob/main/docs/RELEASE_NOTES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              What's New · v1.0.0
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      <QuickCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
      <QuickScanContextSheet
        open={scanContextOpen}
        onOpenChange={setScanContextOpen}
        trips={visibleTrips.map(tb => tb.trip)}
        onNewGroup={() => setScanCreateOpen(true)}
      />
      <QuickScanCreateFlow open={scanCreateOpen} onOpenChange={setScanCreateOpen} />
    </div>
  )
}
