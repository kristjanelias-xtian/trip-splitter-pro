// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
  canProceed: boolean
  isSubmitting?: boolean
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  canProceed,
  isSubmitting = false,
}: WizardNavigationProps) {
  const { t } = useTranslation()
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  return (
    <div className="flex gap-3">
      {!isFirstStep && (
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="lg"
          className="flex-1 h-12"
          disabled={isSubmitting}
        >
          <ChevronLeft size={18} className="mr-2" />
          {t('common.back')}
        </Button>
      )}

      <Button
        type="button"
        onClick={isLastStep ? onSubmit : onNext}
        size="lg"
        className="flex-1 h-12"
        disabled={!canProceed || isSubmitting}
      >
        {isSubmitting ? (
          t('common.adding')
        ) : isLastStep ? (
          t('expenses.addExpense')
        ) : (
          <>
            {t('common.next')}
            <ChevronRight size={18} className="ml-2" />
          </>
        )}
      </Button>
    </div>
  )
}
