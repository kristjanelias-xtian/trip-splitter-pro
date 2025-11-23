import { useState } from 'react'
import { Plus, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { TripForm } from '@/components/TripForm'
import { TripCard } from '@/components/TripCard'
import { CreateTripInput, UpdateTripInput } from '@/types/trip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function TripsPage() {
  const navigate = useNavigate()
  const { trips, loading, error, createTrip, updateTrip, deleteTrip } = useTripContext()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  const handleCreateTrip = async (input: CreateTripInput) => {
    const newTrip = await createTrip(input)
    if (newTrip) {
      setShowCreateForm(false)
      // Navigate to setup page for new trip using trip code
      navigate(`/t/${newTrip.trip_code}/setup`)
    }
  }

  const handleUpdateTrip = async (input: UpdateTripInput) => {
    if (!editingTripId) return
    const success = await updateTrip(editingTripId, input)
    if (success) {
      setEditingTripId(null)
    }
  }

  const handleDeleteTrip = async () => {
    if (deletingTripId) {
      await deleteTrip(deletingTripId)
      setDeletingTripId(null)
    }
  }

  const editingTrip = trips.find(t => t.id === editingTripId)
  const deletingTrip = trips.find(t => t.id === deletingTripId)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            My Trips
          </h2>
          {!showCreateForm && !editingTripId && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus size={16} className="mr-2" />
              New Trip
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <TripForm
                onSubmit={handleCreateTrip}
                onCancel={() => setShowCreateForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {editingTripId && editingTrip && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <TripForm
                onSubmit={handleUpdateTrip}
                onCancel={() => setEditingTripId(null)}
                initialValues={editingTrip}
                submitLabel="Update Trip"
              />
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Loading trips...
              </p>
            </CardContent>
          </Card>
        ) : trips.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MapPin size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No trips yet. Create your first trip to get started!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                isSelected={false}
                onSelect={() => navigate(`/t/${trip.trip_code}/dashboard`)}
                onEdit={() => setEditingTripId(trip.id)}
                onDelete={() => setDeletingTripId(trip.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTripId} onOpenChange={(open) => !open && setDeletingTripId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Trip?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingTrip?.name}"? This will delete all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setDeletingTripId(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTrip}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
