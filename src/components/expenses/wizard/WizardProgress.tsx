import { motion } from 'framer-motion'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const percentage = (currentStep / totalSteps) * 100

  return (
    <div className="mb-6">
      {/* Progress Bar */}
      <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 20,
          }}
        />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-sm font-medium text-primary">
          {percentage.toFixed(0)}%
        </p>
      </div>
    </div>
  )
}
