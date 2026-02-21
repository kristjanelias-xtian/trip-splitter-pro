import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { useMyTripBalances } from '@/hooks/useMyTripBalances'
import { formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { getHiddenTripCodes, showTrip } from '@/lib/mutedTripsStorage'
import { getActiveTripId } from '@/lib/activeTripDetection'
import { GroupActions } from '@/components/quick/GroupActions'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ChevronRight, Plus, Eye, ChevronDown, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function QuickHomeScreen() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { loading: tripsLoading } = useTripContext()
  const { tripBalances, loading: balancesLoading } = useMyTripBalances()
  const loading = balancesLoading || (!!user && tripsLoading)
  const [hiddenCodes, setHiddenCodes] = useState(() => new Set(getHiddenTripCodes()))
  const [showHidden, setShowHidden] = useState(false)

  const firstName = userProfile?.display_name?.split(' ')[0] || 'there'

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* User greeting */}
        <div className="flex items-center gap-3 mb-8">
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
            <p className="text-sm text-muted-foreground">Your groups</p>
          </div>
        </div>

        {/* Groups list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleTrips.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No groups yet. Create a trip or event, or join one via a shared link.
                </p>
                <Button onClick={() => navigate('/create-trip')} className="gap-2">
                  <Plus size={18} />
                  Create New
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleTrips.map(({ trip, myBalance }, i) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <div
                    className="cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={() => navigate(`/t/${trip.trip_code}/quick`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {trip.name}
                            </h3>
                            {trip.id === activeTripId && (
                              <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          {myBalance ? (
                            <p className={`text-lg font-bold tabular-nums ${getBalanceColorClass(myBalance.balance)}`}>
                              {myBalance.balance === 0
                                ? 'Settled up'
                                : myBalance.balance > 0
                                  ? `You are owed ${formatBalance(myBalance.balance)}`
                                  : `You owe ${formatBalance(myBalance.balance).replace('-', '')}`
                              }
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Link yourself to see your balance
                            </p>
                          )}
                        </div>
                        <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 ml-3" />
                      </div>
                    </CardContent>
                  </div>
                  <div className="px-4 pb-2 flex justify-end">
                    <GroupActions
                      tripCode={trip.trip_code}
                      tripName={trip.name}
                      onHidden={() => handleHidden(trip.trip_code)}
                      onLeft={() => handleLeft(trip.trip_code)}
                    />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create trip button */}
        {visibleTrips.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => navigate('/create-trip')} className="gap-2">
              <Plus size={16} />
              Create New
            </Button>
          </div>
        )}

        {/* What's New link */}
        <div className="mt-8 text-center">
          <a
            href="https://github.com/kristjanelias-xtian/trip-splitter-pro/blob/main/RELEASE_NOTES.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            What's New · v0.9.3
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Hidden trips section */}
        {hiddenTrips.length > 0 && (
          <div className="mt-8">
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
      </div>
    </div>
  )
}
