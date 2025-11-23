import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'

export function TripSetupPage() {
  const navigate = useNavigate()
  const { currentTrip } = useTripContext()
  const { participants, families } = useParticipantContext()

  const [isComplete, setIsComplete] = useState(false)

  if (!currentTrip) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Please select or create a trip first.
          </p>
        </div>
      </div>
    )
  }

  const handleComplete = () => {
    setIsComplete(true)
    // Redirect to expenses page after setup
    setTimeout(() => navigate('/expenses'), 1000)
  }

  const hasSetup = currentTrip.tracking_mode === 'individuals'
    ? participants.length > 0
    : families.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trip Setup: {currentTrip.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {currentTrip.tracking_mode === 'individuals'
            ? 'Add participants to your trip'
            : 'Add families and participants to your trip'}
        </p>
      </div>

      {isComplete && (
        <div className="bg-positive-light border border-positive text-positive-dark px-4 py-3 rounded-lg mb-6">
          ✓ Setup complete! Redirecting to expenses...
        </div>
      )}

      {currentTrip.tracking_mode === 'individuals' ? (
        <IndividualsSetup onComplete={handleComplete} hasSetup={hasSetup} />
      ) : (
        <FamiliesSetup onComplete={handleComplete} hasSetup={hasSetup} />
      )}
    </div>
  )
}
