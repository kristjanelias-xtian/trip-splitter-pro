import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { TripForm } from '@/components/TripForm'
import { TripCard } from '@/components/TripCard'
import { CreateTripInput, UpdateTripInput } from '@/types/trip'

export function TripsPage() {
  const navigate = useNavigate()
  const { trips, loading, error, currentTrip, createTrip, updateTrip, deleteTrip, selectTrip } = useTripContext()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)

  const handleCreateTrip = async (input: CreateTripInput) => {
    const newTrip = await createTrip(input)
    if (newTrip) {
      setShowCreateForm(false)
      // Navigate to setup page for new trip
      navigate('/trip-setup')
    }
  }

  const handleUpdateTrip = async (input: UpdateTripInput) => {
    if (!editingTripId) return
    const success = await updateTrip(editingTripId, input)
    if (success) {
      setEditingTripId(null)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    if (window.confirm('Are you sure you want to delete this trip? This will delete all associated data.')) {
      await deleteTrip(tripId)
    }
  }

  const editingTrip = trips.find(t => t.id === editingTripId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Trips
        </h2>
        {!showCreateForm && !editingTripId && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-neutral text-white px-4 py-2 rounded-lg hover:bg-neutral-dark transition-colors"
          >
            + New Trip
          </button>
        )}
      </div>

      {error && (
        <div className="bg-negative-light border border-negative text-negative-dark px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Trip
          </h3>
          <TripForm
            onSubmit={handleCreateTrip}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {editingTripId && editingTrip && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Edit Trip
          </h3>
          <TripForm
            onSubmit={handleUpdateTrip}
            onCancel={() => setEditingTripId(null)}
            initialValues={editingTrip}
            submitLabel="Update Trip"
          />
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Loading trips...
          </p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400 text-center">
            No trips yet. Create your first trip to get started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              isSelected={currentTrip?.id === trip.id}
              onSelect={() => selectTrip(trip.id)}
              onEdit={() => setEditingTripId(trip.id)}
              onDelete={() => handleDeleteTrip(trip.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
