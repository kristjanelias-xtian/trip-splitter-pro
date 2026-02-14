import { useState, useEffect, useRef } from 'react'
import {
  CreateExpenseInput,
  ExpenseCategory,
  ExpenseDistribution,
  SplitMode,
} from '@/types/expense'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useScrollIntoView } from '@/hooks/useScrollIntoView'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ExpenseForm } from './ExpenseForm'
import { WizardProgress } from './wizard/WizardProgress'
import { WizardNavigation } from './wizard/WizardNavigation'
import { WizardStep1 } from './wizard/WizardStep1'
import { WizardStep2 } from './wizard/WizardStep2'
import { WizardStep3 } from './wizard/WizardStep3'
import { WizardStep4 } from './wizard/WizardStep4'

interface ExpenseWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CreateExpenseInput) => Promise<void>
  initialValues?: Partial<CreateExpenseInput>
  mode?: 'create' | 'edit'
}

export function ExpenseWizard({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  mode = 'create',
}: ExpenseWizardProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  // For edit mode or desktop, use the traditional form
  if (mode === 'edit' || !isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <ExpenseForm
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            initialValues={initialValues}
            submitLabel={mode === 'edit' ? 'Update Expense' : 'Add Expense'}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile wizard implementation
  return (
    <MobileWizard
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      initialValues={initialValues}
    />
  )
}

function MobileWizard({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: Omit<ExpenseWizardProps, 'mode'>) {
  const { currentTrip } = useCurrentTrip()
  const { participants, families, getAdultParticipants } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { settlements } = useSettlementContext()

  // Keyboard detection for mobile
  const contentRef = useRef<HTMLDivElement>(null)
  const keyboard = useKeyboardHeight()

  useScrollIntoView(contentRef, {
    enabled: keyboard.isVisible,
    offset: 20,
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSteps = showAdvanced ? 4 : 3

  // Form state
  const [description, setDescription] = useState(initialValues?.description || '')
  const [amount, setAmount] = useState(initialValues?.amount?.toString() || '')
  const [currency, setCurrency] = useState(initialValues?.currency || currentTrip?.default_currency || 'EUR')
  const [paidBy, setPaidBy] = useState(initialValues?.paid_by || '')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [category, setCategory] = useState<string>(
    (initialValues?.category as string) || 'Food'
  )
  const [expenseDate, setExpenseDate] = useState(
    initialValues?.expense_date || new Date().toISOString().split('T')[0]
  )
  const [comment, setComment] = useState(initialValues?.comment || '')
  const [accountForFamilySize, setAccountForFamilySize] = useState(false)

  const adults = getAdultParticipants()
  const isIndividualsMode = currentTrip?.tracking_mode === 'individuals'

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : undefined

  // Calculate balances for smart payer suggestion
  const balanceCalculation = currentTrip
    ? calculateBalances(expenses, participants, families, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates)
    : null
  const suggestedPayer = balanceCalculation?.suggestedNextPayer

  // Auto-select all participants/families on mount
  useEffect(() => {
    if (open && participants.length > 0 && selectedParticipants.length === 0) {
      setSelectedParticipants(participants.map((p) => p.id))
    }
    if (open && families.length > 0 && selectedFamilies.length === 0) {
      setSelectedFamilies(families.map((f) => f.id))
    }
  }, [open, participants, families])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      // Reset to initial state
      setTimeout(() => {
        setCurrentStep(1)
        setShowAdvanced(false)
        setDescription('')
        setAmount('')
        setPaidBy(initialValues?.paid_by || '')
        setComment('')
        setError(null)
        // Don't reset category, currency, date - likely to be reused
      }, 300) // Delay to allow animation to complete
    }
  }, [open])

  const handleParticipantToggle = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleFamilyToggle = (id: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedParticipants(participants.map((p) => p.id))
    setSelectedFamilies(families.map((f) => f.id))
  }

  const handleDeselectAll = () => {
    setSelectedParticipants([])
    setSelectedFamilies([])
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1))
    setError(null)
  }

  const handleNext = () => {
    setError(null)
    if (!canProceed()) return

    setCurrentStep((prev) => Math.min(totalSteps, prev + 1))
  }

  const handleAdvanced = () => {
    setShowAdvanced(true)
    setCurrentStep(4)
  }

  const handleSubmit = async () => {
    if (!currentTrip || !canProceed()) return

    setError(null)
    setIsSubmitting(true)

    try {
      // Validate selection
      if (isIndividualsMode && selectedParticipants.length === 0) {
        setError('Please select at least one person to split between')
        setIsSubmitting(false)
        return
      }
      if (!isIndividualsMode && selectedFamilies.length === 0 && selectedParticipants.length === 0) {
        setError('Please select at least one family or person to split between')
        setIsSubmitting(false)
        return
      }

      // Build distribution based on tracking mode
      let distribution: ExpenseDistribution

      if (isIndividualsMode) {
        distribution = {
          type: 'individuals',
          participants: selectedParticipants,
          splitMode: splitMode,
        }
      } else {
        // Families mode or mixed
        const hasIndividuals = selectedParticipants.length > 0
        const hasFamilies = selectedFamilies.length > 0

        if (hasIndividuals && hasFamilies) {
          distribution = {
            type: 'mixed',
            families: selectedFamilies,
            participants: selectedParticipants,
            splitMode: splitMode,
            accountForFamilySize,
          }
        } else if (hasFamilies) {
          distribution = {
            type: 'families',
            families: selectedFamilies,
            splitMode: splitMode,
            accountForFamilySize,
          }
        } else {
          distribution = {
            type: 'individuals',
            participants: selectedParticipants,
            splitMode: splitMode,
          }
        }
      }

      const expenseInput: CreateExpenseInput = {
        trip_id: currentTrip.id,
        description: description.trim(),
        amount: parseFloat(amount),
        currency,
        paid_by: paidBy,
        distribution,
        category: category as ExpenseCategory,
        expense_date: expenseDate,
        comment: comment.trim() || undefined,
      }

      await onSubmit(expenseInput)
      onOpenChange(false)
    } catch (err) {
      console.error('Error submitting expense:', err)
      setError('Failed to create expense. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return description.trim() !== '' && parseFloat(amount) > 0
      case 2:
        return paidBy !== ''
      case 3:
        return selectedParticipants.length > 0 || selectedFamilies.length > 0
      case 4:
        return true // Advanced options are optional
      default:
        return false
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] flex flex-col p-6 gap-0"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside during submission
          if (isSubmitting) {
            e.preventDefault()
          }
        }}
      >
        <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto -mx-6 px-6"
          style={{
            paddingBottom: keyboard.isVisible ? `${keyboard.keyboardHeight + 80}px` : '20px'
          }}
        >
          {currentStep === 1 && (
            <WizardStep1
              description={description}
              amount={amount}
              currency={currency}
              onDescriptionChange={setDescription}
              onAmountChange={setAmount}
              onCurrencyChange={setCurrency}
              availableCurrencies={availableCurrencies}
              disabled={isSubmitting}
            />
          )}

          {currentStep === 2 && (
            <WizardStep2
              paidBy={paidBy}
              onPaidByChange={setPaidBy}
              adults={adults}
              suggestedPayer={
                suggestedPayer
                  ? {
                      id: suggestedPayer.id,
                      name: suggestedPayer.name,
                      balance: suggestedPayer.balance,
                    }
                  : null
              }
              currency={currentTrip?.default_currency || 'EUR'}
              disabled={isSubmitting}
            />
          )}

          {currentStep === 3 && (
            <WizardStep3
              isIndividualsMode={isIndividualsMode || false}
              participants={participants}
              families={families}
              selectedParticipants={selectedParticipants}
              selectedFamilies={selectedFamilies}
              onParticipantToggle={handleParticipantToggle}
              onFamilyToggle={handleFamilyToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              accountForFamilySize={accountForFamilySize}
              onAccountForFamilySizeChange={setAccountForFamilySize}
              onAdvancedClick={handleAdvanced}
              disabled={isSubmitting}
            />
          )}

          {currentStep === 4 && (
            <WizardStep4
              splitMode={splitMode}
              onSplitModeChange={setSplitMode}
              category={category}
              onCategoryChange={setCategory}
              expenseDate={expenseDate}
              onExpenseDateChange={setExpenseDate}
              comment={comment}
              onCommentChange={setComment}
              disabled={isSubmitting}
            />
          )}
        </div>

        <div className="pt-4 border-t border-border" style={{ flexShrink: 0 }}>
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            canProceed={canProceed()}
            isSubmitting={isSubmitting}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
