import { useState, FormEvent } from 'react'
import { CreateTripInput, TrackingMode } from '@/types/trip'

interface TripFormProps {
  onSubmit: (input: CreateTripInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateTripInput>
  submitLabel?: string
}

export function TripForm({ onSubmit, onCancel, initialValues, submitLabel = 'Create Trip' }: TripFormProps) {
  const [name, setName] = useState(initialValues?.name || '')
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0])
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(initialValues?.tracking_mode || 'individuals')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert('Please enter a trip name')
      return
    }

    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), date, tracking_mode: trackingMode })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Trip Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="e.g., Summer Vacation 2024"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Trip Date
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tracking Mode
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="trackingMode"
              value="individuals"
              checked={trackingMode === 'individuals'}
              onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}
              className="mr-2"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Individuals only</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="trackingMode"
              value="families"
              checked={trackingMode === 'families'}
              onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}
              className="mr-2"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Individuals + Families</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-neutral text-white px-4 py-2 rounded-lg hover:bg-neutral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
