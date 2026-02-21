import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Users, Trash2, ExternalLink, Share2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getMyTrips, removeFromMyTrips, type MyTripEntry } from '@/lib/myTripsStorage'
import { ShareTripDialog } from '@/components/ShareTripDialog'
import { OnboardingPrompts } from '@/components/OnboardingPrompts'

export function HomePage() {
  const navigate = useNavigate()
  const [myTrips, setMyTrips] = useState<MyTripEntry[]>([])

  useEffect(() => {
    // Load My Trips from localStorage
    setMyTrips(getMyTrips())
  }, [])

  const handleRemoveTrip = (tripCode: string, tripName: string) => {
    if (confirm(`Remove "${tripName}" from My Trips?\n\nThis won't delete the trip, you can access it again via the share link.`)) {
      removeFromMyTrips(tripCode)
      setMyTrips(getMyTrips())
    }
  }

  const handleCreateTrip = () => {
    navigate('/create-trip')
  }

  const handleOpenTrip = (tripCode: string) => {
    navigate(`/t/${tripCode}/dashboard`)
  }

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Split costs with anyone
          </h1>
          <p className="text-muted-foreground">
            Split costs fairly among groups with real-time collaboration
          </p>
        </div>

        <OnboardingPrompts />

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <Button onClick={handleCreateTrip} className="gap-2">
            <Plus size={18} />
            Create New
          </Button>
        </div>

        {/* My Trips List */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">My Events & Trips</h2>

          {myTrips.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTrips.map(trip => (
                <Card
                  key={trip.tripCode}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleOpenTrip(trip.tripCode)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-accent transition-colors">
                          {trip.tripName}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Code: {trip.tripCode}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveTrip(trip.tripCode, trip.tripName)
                        }}
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span className="text-xs">
                          Last: {formatDate(trip.lastAccessed)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTrip(trip.tripCode)
                        }}
                      >
                        <ExternalLink size={14} />
                        Open
                      </Button>
                      <ShareTripDialog
                        tripCode={trip.tripCode}
                        tripName={trip.tripName}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Share2 size={14} />
                          </Button>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        {myTrips.length > 0 && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Users size={16} />
              How It Works
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Trips are stored locally on your device</li>
              <li>• Share trip links with your group for real-time collaboration</li>
              <li>• Anyone with the link can view and contribute</li>
              <li>• Remove trips from your list anytime without deleting them</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
