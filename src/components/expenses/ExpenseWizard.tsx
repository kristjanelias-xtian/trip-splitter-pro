// SPDX-License-Identifier: Apache-2.0
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
import { useAuth } from '@/contexts/AuthContext'
import { calculateBalances } from '@/services/balanceCalculator'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { inferCategory } from '@/lib/categoryInference'

import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Desktop: always use Dialog (both create and edit)
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">
            {mode === 'edit' ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <div className="flex-1 min-h-0 flex flex-col px-6 py-6">
            <ExpenseForm
              onSubmit={onSubmit}
              onCancel={() => onOpenChange(false)}
              initialValues={initialValues}
              submitLabel={mode === 'edit' ? 'Update Expense' : 'Add Expense'}
              stickyFooter
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile edit: bottom Sheet with ExpenseForm
  if (mode === 'edit') {
    return (
      <MobileEditSheet
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        initialValues={initialValues}
      />
    )
  }

  // Mobile create: multi-step wizard
  return (
    <MobileWizard
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      initialValues={initialValues}
    />
  )
}

function MobileEditSheet({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: Omit<ExpenseWizardProps, 'mode'>) {
  const keyboard = useKeyboardHeight()
  const scrollRef = useIOSScrollFix()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard.isVisible
            ? `${keyboard.availableHeight}px`
            : '92dvh',
          ...(keyboard.isVisible && {
            top: `${keyboard.viewportOffset}px`,
            bottom: 'auto',
          }),
        }}
      >
        {/* Sticky header */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold">Edit Expense</SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ExpenseForm with stickyFooter handles scroll + buttons internally */}
        <div className="flex-1 min-h-0 flex flex-col px-6 py-4 pwa-safe-bottom">
          <ExpenseForm
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
            initialValues={initialValues}
            submitLabel="Update Expense"
            stickyFooter
            scrollRef={scrollRef}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MobileWizard({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
}: Omit<ExpenseWizardProps, 'mode'>) {
  const { currentTrip } = useCurrentTrip()
  const { participants, getAdultParticipants } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { settlements } = useSettlementContext()
  const { user } = useAuth()

  // Keyboard detection for mobile
  const keyboard = useKeyboardHeight()
  const scrollRef = useIOSScrollFix()

  const [currentStep, setCurrentStep] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
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
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [category, setCategory] = useState<string>(
    (initialValues?.category as string) || 'Food'
  )
  const [expenseDate, setExpenseDate] = useState(
    initialValues?.expense_date || new Date().toISOString().split('T')[0]
  )
  const [comment, setComment] = useState(initialValues?.comment || '')

  // Custom split values for percentage/amount modes
  const [participantSplitValues, setParticipantSplitValues] = useState<Record<string, string>>({})

  // Proportional group splitting (per-expense toggle)
  const [accountForFamilySize, setAccountForFamilySize] = useState(false)

  // Track whether user manually picked a category (don't override with auto-inference)
  const categoryManuallySet = useRef(!!initialValues?.category)

  // Auto-infer category from description (debounced)
  useEffect(() => {
    if (categoryManuallySet.current) return
    const timer = setTimeout(() => {
      const inferred = inferCategory(description)
      if (inferred) setCategory(inferred)
    }, 300)
    return () => clearTimeout(timer)
  }, [description])

  const handleManualCategoryChange = (cat: string) => {
    categoryManuallySet.current = true
    setCategory(cat)
  }

  const adults = getAdultParticipants()

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : undefined

  // Calculate balances for smart payer suggestion
  const balanceCalculation = currentTrip
    ? calculateBalances(expenses, participants, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates)
    : null
  const suggestedPayer = balanceCalculation?.suggestedNextPayer

  // Auto-select all participants on mount if trip setting allows it
  const defaultSplitAll = currentTrip?.default_split_all ?? true
  useEffect(() => {
    if (open && !initialValues?.distribution && defaultSplitAll) {
      if (participants.length > 0 && selectedParticipants.length === 0) {
        setSelectedParticipants(participants.map((p) => p.id))
      }
    }
  }, [open, participants])

  // Pre-fill paidBy with the authenticated user's linked adult participant
  useEffect(() => {
    if (!open) return
    if (paidBy !== '') return // already set (editing, or user already chose someone)
    if (!user || participants.length === 0) return
    const myParticipant = participants.find(p => p.user_id === user.id && p.is_adult)
    if (myParticipant) setPaidBy(myParticipant.id)
  }, [open, participants, user])

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
        setErrorDetail(null)
        setSplitMode('equal')
        setParticipantSplitValues({})
        setAccountForFamilySize(false)
        categoryManuallySet.current = false
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

  const handleSelectAll = () => {
    setSelectedParticipants(participants.map((p) => p.id))
  }

  const handleDeselectAll = () => {
    setSelectedParticipants([])
  }

  const handleGroupToggle = (memberIds: string[]) => {
    setSelectedParticipants(prev => {
      const allSelected = memberIds.every(id => prev.includes(id))
      if (allSelected) {
        // Deselect all members of the group
        return prev.filter(id => !memberIds.includes(id))
      } else {
        // Select all members of the group
        const newSet = new Set(prev)
        for (const id of memberIds) newSet.add(id)
        return Array.from(newSet)
      }
    })
  }

  const handleParticipantSplitChange = (id: string, value: string) => {
    setParticipantSplitValues(prev => ({ ...prev, [id]: value }))
  }

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode)
    setParticipantSplitValues({})
  }

  // Auto-fill split value when exactly one participant is selected in "By Amount" mode
  useEffect(() => {
    if (splitMode !== 'amount') return
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) return
    if (selectedParticipants.length !== 1) return

    const id = selectedParticipants[0]
    const current = participantSplitValues[id]
    if (!current || current === '' || current === '0') {
      setParticipantSplitValues(prev => ({ ...prev, [id]: amount }))
    }
  }, [splitMode, selectedParticipants, amount])

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1))
    setError(null)
    setErrorDetail(null)
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
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    if (!currentTrip || !canProceed()) {
      isSubmittingRef.current = false
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      if (selectedParticipants.length === 0) {
        setError('Please select at least one person to split between')
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
        if (Math.abs(totalAmount - amountNum) > 0.01) {
          setError(`Custom amounts must sum to total (${currency} ${amountNum.toFixed(2)}). Currently: ${currency} ${totalAmount.toFixed(2)}`)
          setIsSubmitting(false)
          return
        }
      }

      // Build distribution — always individuals
      // Check if any selected participant has a wallet_group
      const hasGroups = selectedParticipants.some(pid => participants.find(p => p.id === pid)?.wallet_group)
      const distribution: ExpenseDistribution = {
        type: 'individuals',
        participants: selectedParticipants,
        splitMode: splitMode,
        participantSplits: splitMode !== 'equal'
          ? selectedParticipants.map(id => ({
              participantId: id,
              value: parseFloat(participantSplitValues[id] || '0')
            }))
          : undefined,
        accountForFamilySize: hasGroups ? accountForFamilySize : undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to create expense.')
      setErrorDetail(err instanceof Error ? (err.stack ?? null) : String(err))
    } finally {
      isSubmittingRef.current = false
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
        return selectedParticipants.length > 0
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
          return Math.abs(total - 100) <= 0.01
        }
        if (splitMode === 'amount') {
          let total = 0
          for (const id of selectedParticipants) {
            const v = parseFloat(participantSplitValues[id] || '0')
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
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard.isVisible
            ? `${keyboard.availableHeight}px`
            : '92dvh',
          ...(keyboard.isVisible && {
            top: `${keyboard.viewportOffset}px`,
            bottom: 'auto',
          }),
        }}
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside during submission
          if (isSubmitting) {
            e.preventDefault()
          }
        }}
      >
        {/* Sticky header — never scrolls */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold">Add Expense</SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="px-4 pb-3">
            <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />
          </div>
        </div>

        {/* Scrollable content — only this scrolls */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-6 py-4"
        >
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <div className="flex items-start justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="shrink-0 text-xs underline underline-offset-2 opacity-80 hover:opacity-100 disabled:opacity-40"
                >
                  Try again
                </button>
              </div>
              {errorDetail && (
                <pre className="mt-2 text-xs whitespace-pre-wrap break-all opacity-80">{errorDetail}</pre>
              )}
            </div>
          )}

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
              participants={participants}
              selectedParticipants={selectedParticipants}
              onParticipantToggle={handleParticipantToggle}
              onGroupToggle={handleGroupToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onAdvancedClick={handleAdvanced}
              accountForFamilySize={accountForFamilySize}
              onAccountForFamilySizeChange={setAccountForFamilySize}
              disabled={isSubmitting}
            />
          )}

          {currentStep === 4 && (
            <WizardStep4
              splitMode={splitMode}
              onSplitModeChange={handleSplitModeChange}
              category={category}
              onCategoryChange={handleManualCategoryChange}
              expenseDate={expenseDate}
              onExpenseDateChange={setExpenseDate}
              comment={comment}
              onCommentChange={setComment}
              disabled={isSubmitting}
              amount={amount}
              currency={currency}
              participants={participants}
              selectedParticipants={selectedParticipants}
              participantSplitValues={participantSplitValues}
              onParticipantSplitChange={handleParticipantSplitChange}
            />
          )}
        </div>

        {/* Sticky footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 pwa-safe-bottom">
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
