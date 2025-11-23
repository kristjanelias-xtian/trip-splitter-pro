import { useState, FormEvent } from 'react'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'

interface IndividualsSetupProps {
  onComplete: () => void
  hasSetup: boolean
}

export function IndividualsSetup({ onComplete, hasSetup }: IndividualsSetupProps) {
  const { currentTrip } = useTripContext()
  const { participants, createParticipant, deleteParticipant } = useParticipantContext()

  const [name, setName] = useState('')
  const [isAdult, setIsAdult] = useState(true)
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()

    if (!currentTrip || !name.trim()) return

    setAdding(true)
    try {
      await createParticipant({
        trip_id: currentTrip.id,
        name: name.trim(),
        is_adult: isAdult,
        family_id: null,
      })
      setName('')
      setIsAdult(true)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove this participant?')) {
      await deleteParticipant(id)
    }
  }

  const canComplete = participants.length > 0

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add Participants
        </h3>

        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Participant Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., John Doe"
              required
              disabled={adding}
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAdult"
              checked={isAdult}
              onChange={(e) => setIsAdult(e.target.checked)}
              className="mr-2"
              disabled={adding}
            />
            <label htmlFor="isAdult" className="text-sm text-gray-700 dark:text-gray-300">
              Adult (can pay for expenses)
            </label>
          </div>

          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="w-full bg-neutral text-white px-4 py-2 rounded-lg hover:bg-neutral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : '+ Add Participant'}
          </button>
        </form>
      </div>

      {participants.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Participants ({participants.length})
          </h3>

          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {participant.name}
                  </span>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {participant.is_adult ? '(Adult)' : '(Child)'}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(participant.id)}
                  className="text-negative hover:text-negative-dark p-1 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {canComplete && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <button
            onClick={onComplete}
            className="w-full bg-positive text-white px-6 py-3 rounded-lg hover:bg-positive-dark transition-colors font-semibold"
          >
            {hasSetup ? 'Update & Continue' : 'Complete Setup'}
          </button>
        </div>
      )}

      {!canComplete && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Add at least one participant to continue
          </p>
        </div>
      )}
    </div>
  )
}
