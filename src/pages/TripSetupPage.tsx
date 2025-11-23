import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'
import { Card } from '@/components/ui/card'

export function TripSetupPage() {
  const navigate = useNavigate()
  const { currentTrip, tripId } = useCurrentTrip()
  const { participants, families } = useParticipantContext()

  const [isComplete, setIsComplete] = useState(false)

  if (!currentTrip) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <p className="text-muted-foreground text-center">
            Please select or create a trip first.
          </p>
        </Card>
      </div>
    )
  }

  const handleComplete = () => {
    setIsComplete(true)
    // Redirect to expenses page after setup
    setTimeout(() => navigate(`/trips/${tripId}/expenses`), 1000)
  }

  const hasSetup = currentTrip.tracking_mode === 'individuals'
    ? participants.length > 0
    : families.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          Trip Setup: {currentTrip.name}
        </h2>
        <p className="text-muted-foreground mt-1">
          {currentTrip.tracking_mode === 'individuals'
            ? 'Add participants to your trip'
            : 'Add families and participants to your trip'}
        </p>
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-positive/10 border border-positive/30 text-positive px-4 py-3 rounded-lg mb-6 flex items-center gap-2"
          >
            <CheckCircle2 size={20} />
            <span>Setup complete! Redirecting to expenses...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {currentTrip.tracking_mode === 'individuals' ? (
        <IndividualsSetup onComplete={handleComplete} hasSetup={hasSetup} />
      ) : (
        <FamiliesSetup onComplete={handleComplete} hasSetup={hasSetup} />
      )}
    </div>
  )
}
