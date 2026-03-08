// SPDX-License-Identifier: Apache-2.0

interface WizardProgressProps {
  currentStep: number
  totalSteps: number
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-1">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        return (
          <div
            key={step}
            className={`rounded-full transition-all duration-200 ${
              step === currentStep
                ? 'w-5 h-1.5 bg-primary'
                : step < currentStep
                  ? 'w-1.5 h-1.5 bg-primary/60'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30'
            }`}
          />
        )
      })}
    </div>
  )
}
