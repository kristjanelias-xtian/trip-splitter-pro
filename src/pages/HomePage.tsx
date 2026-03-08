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
import { ThemeToggle } from '@/components/ThemeToggle'

const DEMO_TRIP_CODE = 'livigno-2025'

/**
 * Home Page — Trip Visibility Contract
 *
 * Anonymous users (not signed in):
 *   Data source: localStorage key `trip-splitter:my-trips`
 *   - Populated automatically by useCurrentTrip when any trip URL is visited
 *   - Only trip references (code + name) are stored locally; trip data lives in Supabase
 *   - Ephemeral: iOS WebKit may evict localStorage after ~7 days of inactivity
 *   - If localStorage is empty → empty state with sign-in suggestion
 *   - If localStorage has entries → TripContext fetches those specific trips
 *     from DB (by trip_code), shown as simple cards with name + last accessed
 *   - No balance calculation (requires participant link)
 *
 * Authenticated users:
 *   Data source: Supabase DB (primary) + localStorage merge (visited trips)
 *   - DB query finds trips via 3 paths:
 *     1. User is trip creator (created_by = user.id)
 *     2. User linked as participant (participants.user_id = user.id)
 *     3. Email discovery: participant with matching email but no user_id link yet
 *   - localStorage trips not in DB results are fetched individually and merged
 *   - Split into "My Trips" (creator or has participant link → myBalance !== null)
 *     and "Visited" (localStorage-only, no participant record → myBalance === null)
 *   - TripCards show balance summary via useMyTripBalances hook
 *
 * PWA considerations:
 *   - localStorage holds only trip references (codes); trip data is always in Supabase
 *   - After iOS eviction, anonymous users lose their trip links; auth users are unaffected
 *
 * Trip access model:
 *   - Trip URL = access token. Anyone with /t/:tripCode can view any trip.
 *   - ensureTripLoaded() handles navigation to trips not in the local array
 *   - useCurrentTrip auto-adds every visited trip to localStorage
 */
export function HomePage() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { loading: tripsLoading, refreshTrips, emailDiscoveredTripIds } = useTripContext()
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

  // Split visible trips into "my trips", "invited" (email-discovered), and "visited" (localStorage-only)
  const invitedTrips = visibleTrips.filter(({ trip }) => emailDiscoveredTripIds.has(trip.id))
  const myTrips = visibleTrips.filter(({ trip, myBalance }) =>
    !emailDiscoveredTripIds.has(trip.id) && (trip.created_by === user?.id || myBalance !== null)
  )
  const visitedTrips = visibleTrips.filter(({ trip, myBalance }) =>
    !emailDiscoveredTripIds.has(trip.id) && trip.created_by !== user?.id && myBalance === null
  )

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
            Create a new trip, access one via a shared link, or sign in to access your trips from anywhere
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

  const renderTripGrid = (trips: typeof visibleTrips) => (
    <div className={`grid grid-cols-1 gap-4 ${trips.length >= 2 ? 'md:grid-cols-2' : ''}`}>
      {trips.map(({ trip, myBalance }, i) => (
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
                showRemove={trip.created_by !== user?.id && myBalance === null && !emailDiscoveredTripIds.has(trip.id)}
                onHidden={() => handleHidden(trip.trip_code)}
                onLeft={() => handleLeft(trip.trip_code)}
              />
            }
          />
        </motion.div>
      ))}
    </div>
  )

  // Authenticated view: TripCard with balances
  const renderAuthenticatedTrips = () => {
    if (loading) {
      return <PageLoadingState />
    }

    if (visibleTrips.length === 0) {
      return renderEmptyState()
    }

    const sectionCount = [myTrips, invitedTrips, visitedTrips].filter(s => s.length > 0).length
    const showHeadings = sectionCount > 1

    return (
      <>
        {myTrips.length > 0 && (
          <>
            {showHeadings && <h2 className="text-sm font-medium text-muted-foreground mb-3">My Trips</h2>}
            {renderTripGrid(myTrips)}
          </>
        )}

        {invitedTrips.length > 0 && (
          <div className={myTrips.length > 0 ? 'mt-8' : ''}>
            {showHeadings && <h2 className="text-sm font-medium text-muted-foreground mb-3">Invited</h2>}
            {renderTripGrid(invitedTrips)}
          </div>
        )}

        {visitedTrips.length > 0 && (
          <div className={myTrips.length > 0 || invitedTrips.length > 0 ? 'mt-8' : ''}>
            {showHeadings && <h2 className="text-sm font-medium text-muted-foreground mb-3">Visited</h2>}
            {renderTripGrid(visitedTrips)}
          </div>
        )}

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
      <>
      <div className={`grid grid-cols-1 gap-4 ${localTrips.length >= 2 ? 'md:grid-cols-2' : ''}`}>
        {localTrips.map((trip) => (
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
      <p className="mt-6 text-xs text-center text-muted-foreground">
        Your trip links are saved on this device only.{' '}
        Sign in to access them from anywhere.
      </p>
    </>
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

        <OnboardingPrompts hasPaidExpense={tripBalances.some(tb => tb.myBalance && tb.myBalance.totalPaid > 0)} />

        {/* Scan CTA — authenticated users only */}
        {isAuthenticated && (
          <button
            onClick={handleScanTap}
            disabled={loading}
            className="w-full lg:hidden flex items-center justify-between px-5 py-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all mb-6 disabled:opacity-50"
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

        {/* Action Buttons — unauthenticated only (authenticated uses sheet + scan CTA) */}
        {!isAuthenticated && localTrips.length > 0 && (
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

        {/* Footer: theme toggle (for anon users) + What's New */}
        <div className="mt-8 flex flex-col items-center gap-3">
          {!isAuthenticated && (
            <ThemeToggle />
          )}
          {isAuthenticated && (
            <a
              href="https://github.com/kristjanelias-xtian/trip-splitter-pro/blob/main/docs/RELEASE_NOTES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              What's New · v1.0.0
              <ExternalLink size={12} />
            </a>
          )}
        </div>
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
