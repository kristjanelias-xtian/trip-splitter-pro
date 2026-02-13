import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useMyTripBalances } from '@/hooks/useMyTripBalances'
import { formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { getMutedTripCodes } from '@/lib/mutedTripsStorage'
import { GroupActions } from '@/components/quick/GroupActions'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function QuickHomeScreen() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { tripBalances, loading } = useMyTripBalances()
  const [mutedCodes, setMutedCodes] = useState(() => new Set(getMutedTripCodes()))

  const firstName = userProfile?.display_name?.split(' ')[0] || 'there'

  const visibleTrips = tripBalances.filter(tb => !mutedCodes.has(tb.trip.trip_code))

  const handleMuted = useCallback((tripCode: string) => {
    setMutedCodes(prev => new Set([...prev, tripCode]))
  }, [])

  const handleLeft = useCallback((tripCode: string) => {
    // Trip will disappear on next load since it's removed from My Trips
    // Force a re-render by updating muted set (trip won't show either way)
    setMutedCodes(prev => new Set([...prev, tripCode]))
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
                  No groups yet. Create a trip or join one via a shared link.
                </p>
                <Button onClick={() => navigate('/create-trip')} className="gap-2">
                  <Plus size={18} />
                  Create Trip
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
                          <h3 className="font-semibold text-foreground truncate">
                            {trip.name}
                          </h3>
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
                      onMuted={() => handleMuted(trip.trip_code)}
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
              Create New Trip
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
