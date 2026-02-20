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
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

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
  const [accountForFamilySize, setAccountForFamilySize] = useState(true)

  // Custom split values for percentage/amount modes
  const [participantSplitValues, setParticipantSplitValues] = useState<Record<string, string>>({})
  const [familySplitValues, setFamilySplitValues] = useState<Record<string, string>>({})

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

  // Auto-select all participants/families on mount if trip setting allows it
  const defaultSplitAll = currentTrip?.default_split_all ?? true
  useEffect(() => {
    if (open && !initialValues?.distribution && defaultSplitAll) {
      if (participants.length > 0 && selectedParticipants.length === 0) {
        setSelectedParticipants(participants.map((p) => p.id))
      }
      if (families.length > 0 && selectedFamilies.length === 0) {
        setSelectedFamilies(families.map((f) => f.id))
      }
    }
  }, [open, participants, families])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      // Reset to initial state after animation completes
      const timer = setTimeout(() => {
        if (!isMounted.current) return
        setCurrentStep(1)
        setShowAdvanced(false)
        setIsSubmitting(false)
        setDescription('')
        setAmount('')
        setPaidBy(initialValues?.paid_by || '')
        setComment('')
        setError(null)
        setSplitMode('equal')
        setParticipantSplitValues({})
        setFamilySplitValues({})
        // Don't reset category, currency, date - likely to be reused
      }, 300)
      return () => clearTimeout(timer)
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

  const handleParticipantSplitChange = (id: string, value: string) => {
    setParticipantSplitValues(prev => ({ ...prev, [id]: value }))
  }

  const handleFamilySplitChange = (id: string, value: string) => {
    setFamilySplitValues(prev => ({ ...prev, [id]: value }))
  }

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode)
    setParticipantSplitValues({})
    setFamilySplitValues({})
  }

  // Auto-fill split value when exactly one party is selected in "By Amount" mode
  useEffect(() => {
    if (splitMode !== 'amount') return
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return
    const totalSelected = selectedParticipants.length + selectedFamilies.length
    if (totalSelected !== 1) return

    if (selectedFamilies.length === 1) {
      const id = selectedFamilies[0]
      const current = familySplitValues[id]
      if (!current || current === '' || current === '0') {
        setFamilySplitValues(prev => ({ ...prev, [id]: amount }))
      }
    } else if (selectedParticipants.length === 1) {
      const id = selectedParticipants[0]
      const current = participantSplitValues[id]
      if (!current || current === '' || current === '0') {
        setParticipantSplitValues(prev => ({ ...prev, [id]: amount }))
      }
    }
  }, [splitMode, selectedFamilies, selectedParticipants, amount])

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
    if (isSubmitting) return
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

      // Validate custom split values
      const amountNum = parseFloat(amount)
      if (splitMode === 'percentage') {
        let totalPercentage = 0
        for (const id of selectedParticipants) {
          const value = parseFloat(participantSplitValues[id] || '0')
          if (isNaN(value) || value <= 0) {
            setError('Please enter valid percentages for all selected participants')
            setIsSubmitting(false)
            return
          }
          totalPercentage += value
        }
        for (const id of selectedFamilies) {
          const value = parseFloat(familySplitValues[id] || '0')
          if (isNaN(value) || value <= 0) {
            setError('Please enter valid percentages for all selected families')
            setIsSubmitting(false)
            return
          }
          totalPercentage += value
        }
        if (Math.abs(totalPercentage - 100) > 0.01) {
          setError(`Percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`)
          setIsSubmitting(false)
          return
        }
      } else if (splitMode === 'amount') {
        let totalAmount = 0
        for (const id of selectedParticipants) {
          const value = parseFloat(participantSplitValues[id] || '0')
          if (isNaN(value) || value <= 0) {
            setError('Please enter valid amounts for all selected participants')
            setIsSubmitting(false)
            return
          }
          totalAmount += value
        }
        for (const id of selectedFamilies) {
          const value = parseFloat(familySplitValues[id] || '0')
          if (isNaN(value) || value <= 0) {
            setError('Please enter valid amounts for all selected families')
            setIsSubmitting(false)
            return
          }
          totalAmount += value
        }
        if (Math.abs(totalAmount - amountNum) > 0.01) {
          setError(`Custom amounts must sum to total (${currency} ${amountNum.toFixed(2)}). Currently: ${currency} ${totalAmount.toFixed(2)}`)
          setIsSubmitting(false)
          return
        }
      }

      // Build distribution based on tracking mode
      let distribution: ExpenseDistribution

      if (isIndividualsMode) {
        distribution = {
          type: 'individuals',
          participants: selectedParticipants,
          splitMode: splitMode,
          participantSplits: splitMode !== 'equal'
            ? selectedParticipants.map(id => ({
                participantId: id,
                value: parseFloat(participantSplitValues[id] || '0')
              }))
            : undefined,
        }
      } else {
        // Families mode or mixed
        const hasIndividuals = selectedParticipants.length > 0
        const hasFamilies = selectedFamilies.length > 0

        if (hasIndividuals && hasFamilies) {
          // Filter out family members from participants to avoid double-counting
          const standaloneParticipants = selectedParticipants.filter(participantId => {
            const participant = participants.find(p => p.id === participantId)
            if (!participant) return false
            if (participant.family_id === null) return true
            return !selectedFamilies.includes(participant.family_id)
          })

          distribution = {
            type: 'mixed',
            families: selectedFamilies,
            participants: standaloneParticipants,
            splitMode: splitMode,
            accountForFamilySize,
            familySplits: splitMode !== 'equal'
              ? selectedFamilies.map(id => ({
                  familyId: id,
                  value: parseFloat(familySplitValues[id] || '0')
                }))
              : undefined,
            participantSplits: splitMode !== 'equal'
              ? standaloneParticipants.map(id => ({
                  participantId: id,
                  value: parseFloat(participantSplitValues[id] || '0')
                }))
              : undefined,
          }
        } else if (hasFamilies) {
          distribution = {
            type: 'families',
            families: selectedFamilies,
            splitMode: splitMode,
            accountForFamilySize,
            familySplits: splitMode !== 'equal'
              ? selectedFamilies.map(id => ({
                  familyId: id,
                  value: parseFloat(familySplitValues[id] || '0')
                }))
              : undefined,
          }
        } else {
          distribution = {
            type: 'individuals',
            participants: selectedParticipants,
            splitMode: splitMode,
            participantSplits: splitMode !== 'equal'
              ? selectedParticipants.map(id => ({
                  participantId: id,
                  value: parseFloat(participantSplitValues[id] || '0')
                }))
              : undefined,
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
      if (isMounted.current) setIsSubmitting(false)
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
      case 4: {
        if (splitMode === 'equal') return true
        const amtNum = parseFloat(amount)
        if (splitMode === 'percentage') {
          let total = 0
          for (const id of selectedParticipants) {
            const v = parseFloat(participantSplitValues[id] || '0')
            if (isNaN(v) || v <= 0) return false
            total += v
          }
          for (const id of selectedFamilies) {
            const v = parseFloat(familySplitValues[id] || '0')
            if (isNaN(v) || v <= 0) return false
            total += v
          }
          return Math.abs(total - 100) <= 0.01
        }
        if (splitMode === 'amount') {
          let total = 0
          for (const id of selectedParticipants) {
            const v = parseFloat(participantSplitValues[id] || '0')
            if (isNaN(v) || v <= 0) return false
            total += v
          }
          for (const id of selectedFamilies) {
            const v = parseFloat(familySplitValues[id] || '0')
            if (isNaN(v) || v <= 0) return false
            total += v
          }
          return !isNaN(amtNum) && Math.abs(total - amtNum) <= 0.01
        }
        return true
      }
      default:
        return false
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col p-6 gap-0"
        style={{
          height: keyboard.isVisible
            ? `${keyboard.availableHeight}px`
            : '90vh',
          bottom: keyboard.isVisible
            ? `${keyboard.keyboardHeight}px`
            : undefined,
        }}
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
          className="flex-1 overflow-y-auto -mx-6 px-6 pb-4"
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
              onSplitModeChange={handleSplitModeChange}
              category={category}
              onCategoryChange={setCategory}
              expenseDate={expenseDate}
              onExpenseDateChange={setExpenseDate}
              comment={comment}
              onCommentChange={setComment}
              disabled={isSubmitting}
              amount={amount}
              currency={currency}
              isIndividualsMode={isIndividualsMode || false}
              participants={participants}
              families={families}
              selectedParticipants={selectedParticipants}
              selectedFamilies={selectedFamilies}
              participantSplitValues={participantSplitValues}
              familySplitValues={familySplitValues}
              onParticipantSplitChange={handleParticipantSplitChange}
              onFamilySplitChange={handleFamilySplitChange}
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
