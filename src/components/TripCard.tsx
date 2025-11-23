import { Trip } from '@/types/trip'

interface TripCardProps {
  trip: Trip
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TripCard({ trip, isSelected, onSelect, onEdit, onDelete }: TripCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-neutral bg-neutral-light dark:bg-neutral/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {trip.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {formatDate(trip.date)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {trip.tracking_mode === 'individuals' ? 'Individuals only' : 'Individuals + Families'}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="text-neutral hover:text-neutral-dark p-2 rounded transition-colors"
            title="Edit trip"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-negative hover:text-negative-dark p-2 rounded transition-colors"
            title="Delete trip"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
