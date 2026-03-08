// SPDX-License-Identifier: Apache-2.0
import { motion } from 'framer-motion'

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const percentage = (currentStep / totalSteps) * 100

  return (
    <div className="mt-2">
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden mb-1">
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
        <p className="text-xs text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="text-xs font-medium text-primary">
          {percentage.toFixed(0)}%
        </p>
      </div>
    </div>
  )
}
