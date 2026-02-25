import { useState, useEffect, useRef, useMemo, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronDown, ChevronRight, Users, Check } from 'lucide-react'
import { CreateExpenseInput, ExpenseCategory, ExpenseDistribution, SplitMode } from '@/types/expense'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { calculateBalances, formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'
import { ExpenseSplitPreview } from './ExpenseSplitPreview'

interface ExpenseFormProps {
  onSubmit: (input: CreateExpenseInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateExpenseInput>
  submitLabel?: string
}

const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Accommodation',
  'Transport',
  'Activities',
  'Training',
  'Other',
]

export function ExpenseForm({
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = 'Add Expense',
}: ExpenseFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants, getAdultParticipants } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { settlements } = useSettlementContext()

  const [description, setDescription] = useState(initialValues?.description || '')
  const [amount, setAmount] = useState(initialValues?.amount?.toString() || '')
  const [currency, setCurrency] = useState(initialValues?.currency || currentTrip?.default_currency || 'EUR')
  const [paidBy, setPaidBy] = useState(initialValues?.paid_by || '')
  const [category, setCategory] = useState<ExpenseCategory>(initialValues?.category || 'Food')
  const [expenseDate, setExpenseDate] = useState(
    initialValues?.expense_date || new Date().toISOString().split('T')[0]
  )
  const [comment, setComment] = useState(initialValues?.comment || '')
  const [showMoreDetails, setShowMoreDetails] = useState(false)

  // Distribution state — always individuals
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')

  // Custom split values for percentage/amount modes
  const [participantSplitValues, setParticipantSplitValues] = useState<Record<string, string>>({})

  // Proportional group splitting (per-expense toggle)
  const [accountForFamilySize, setAccountForFamilySize] = useState(false)

  // Show toggle only when any selected participant belongs to a wallet_group
  const hasSelectedGroups = useMemo(() => {
    const selectedSet = new Set(selectedParticipants)
    return participants.some(p => selectedSet.has(p.id) && !!p.wallet_group)
  }, [selectedParticipants, participants])

  // Auto-fill split value when exactly one party is selected in "By Amount" mode
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

  const [loading, setLoading] = useState(false)
  const isSubmittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const adults = getAdultParticipants()

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : ['EUR', 'USD', 'GBP', 'THB']

  // Calculate balances to find suggested payer (including settlements)
  const balanceCalculation = currentTrip
    ? calculateBalances(expenses, participants, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates)
    : null
  const suggestedPayer = balanceCalculation?.suggestedNextPayer

  // Auto-select all participants on mount if not editing and trip setting allows it
  const defaultSplitAll = currentTrip?.default_split_all ?? true
  useEffect(() => {
    if (!initialValues?.distribution && defaultSplitAll) {
      if (participants.length > 0 && selectedParticipants.length === 0) {
        setSelectedParticipants(participants.map(p => p.id))
      }
    }
  }, [participants])

  // Restore distribution selections when editing existing expense
  useEffect(() => {
    if (initialValues?.distribution) {
      const dist = initialValues.distribution

      if (dist.type === 'individuals') {
        setSelectedParticipants(dist.participants || [])
        if (dist.accountForFamilySize) {
          setAccountForFamilySize(true)
        }
      }

      // Restore split mode
      if (dist.splitMode) {
        setSplitMode(dist.splitMode)
      }

      // Restore custom split values
      if (dist.splitMode === 'percentage' || dist.splitMode === 'amount') {
        if ('participantSplits' in dist && dist.participantSplits) {
          const values: Record<string, string> = {}
          dist.participantSplits.forEach(split => {
            values[split.participantId] = split.value.toString()
          })
          setParticipantSplitValues(values)
        }
      }
    }
  }, [initialValues])

  const handleParticipantToggle = (id: string) => {
    setSelectedParticipants(prev => {
      const newSelection = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]

      // Initialize split value for new selections in non-equal mode
      if (!prev.includes(id) && splitMode !== 'equal') {
        setParticipantSplitValues(vals => ({
          ...vals,
          [id]: ''
        }))
      }

      return newSelection
    })
  }

  const handleSelectAll = () => {
    setSelectedParticipants(participants.map(p => p.id))
  }

  const handleDeselectAll = () => {
    setSelectedParticipants([])
  }

  const handleGroupToggle = (memberIds: string[]) => {
    setSelectedParticipants(prev => {
      const allSelected = memberIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !memberIds.includes(id))
      } else {
        const newSet = new Set(prev)
        for (const id of memberIds) newSet.add(id)
        return Array.from(newSet)
      }
    })
  }

  const handleParticipantSplitChange = (id: string, value: string) => {
    setParticipantSplitValues(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode)
    // Reset custom split values when switching modes
    setParticipantSplitValues({})
  }

  const executeSubmit = async () => {
    if (isSubmittingRef.current) return
    setError(null)

    if (!description.trim()) {
      setError('Please enter a description')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    if (!paidBy) {
      setError('Please select who paid')
      return
    }

    if (selectedParticipants.length === 0) {
      setError('Please select at least one person to split between')
      return
    }

    // Validate split mode values
    if (splitMode === 'percentage') {
      let totalPercentage = 0
      for (const id of selectedParticipants) {
        const value = parseFloat(participantSplitValues[id] || '0')
        if (isNaN(value) || value <= 0) {
          setError('Please enter valid percentages for all selected participants')
          return
        }
        totalPercentage += value
      }
      if (Math.abs(totalPercentage - 100) > 0.01) {
        setError(`Percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`)
        return
      }
    } else if (splitMode === 'amount') {
      let totalAmount = 0
      for (const id of selectedParticipants) {
        const value = parseFloat(participantSplitValues[id] || '0')
        if (isNaN(value) || value <= 0) {
          setError('Please enter valid amounts for all selected participants')
          return
        }
        totalAmount += value
      }
      if (Math.abs(totalAmount - amountNum) > 0.01) {
        setError(`Custom amounts must sum to total (${currency} ${amountNum.toFixed(2)}). Currently: ${currency} ${totalAmount.toFixed(2)}`)
        return
      }
    }

    // Build distribution object — always individuals
    const distribution: ExpenseDistribution = {
      type: 'individuals',
      participants: selectedParticipants,
      splitMode,
      participantSplits: splitMode !== 'equal'
        ? selectedParticipants.map(id => ({
            participantId: id,
            value: parseFloat(participantSplitValues[id] || '0')
          }))
        : undefined,
      accountForFamilySize: hasSelectedGroups ? accountForFamilySize : undefined,
    }

    if (!currentTrip) {
      setError('No trip selected')
      return
    }

    isSubmittingRef.current = true
    setLoading(true)
    try {
      await onSubmit({
        trip_id: currentTrip.id,
        description: description.trim(),
        amount: amountNum,
        currency,
        paid_by: paidBy,
        distribution,
        category,
        expense_date: expenseDate,
        comment: comment.trim() || undefined,
      })

      // Reset form
      setDescription('')
      setAmount('')
      setComment('')
      setSelectedParticipants(participants.map(p => p.id))
      setShowMoreDetails(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense.')
      setErrorDetail(err instanceof Error ? (err.stack ?? null) : String(err))
    } finally {
      isSubmittingRef.current = false
      if (isMounted.current) setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await executeSubmit()
  }

  // Group participants by wallet_group for display
  const participantGroups = (() => {
    const groups: { label: string | null; members: typeof participants }[] = []
    const grouped = new Map<string, typeof participants>()
    const standalone: typeof participants = []

    for (const p of participants) {
      if (p.wallet_group) {
        const existing = grouped.get(p.wallet_group) || []
        existing.push(p)
        grouped.set(p.wallet_group, existing)
      } else {
        standalone.push(p)
      }
    }

    for (const [label, members] of grouped) {
      groups.push({ label, members })
    }
    if (standalone.length > 0) {
      groups.push({ label: null, members: standalone })
    }

    return groups
  })()

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={executeSubmit}
              disabled={loading}
              className="shrink-0 text-xs h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              Try again
            </Button>
          </div>
          {errorDetail && (
            <pre className="mt-2 text-xs whitespace-pre-wrap break-all opacity-80">{errorDetail}</pre>
          )}
        </motion.div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          type="text"
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g., Dinner at restaurant"
          required
          disabled={loading}
        />
      </div>

      {/* Amount and Currency */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="decimal"
            id="amount"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(',', '.'))}
            className="flex-1 text-2xl h-14 tabular-nums"
            placeholder="0.00"
            pattern="[0-9]*[.,]?[0-9]*"
            required
            disabled={loading}
          />
          <Select
            value={currency}
            onValueChange={setCurrency}
            disabled={loading}
          >
            <SelectTrigger className="w-28 h-14 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Who Paid */}
      <div className="space-y-2">
        <Label htmlFor="paidBy">Who Paid?</Label>

        {/* Smart Payer Suggestion */}
        {suggestedPayer && expenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-accent/10 border border-accent/20 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lightbulb size={16} className="text-accent" />
                  <span><strong>{suggestedPayer.name}</strong> should pay next</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Current balance:{' '}
                  <span className={getBalanceColorClass(suggestedPayer.balance)}>
                    {formatBalance(suggestedPayer.balance, currentTrip?.default_currency || 'EUR')}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <Select
          value={paidBy}
          onValueChange={setPaidBy}
          disabled={loading}
        >
          <SelectTrigger id="paidBy">
            <SelectValue placeholder="Select person..." />
          </SelectTrigger>
          <SelectContent>
            {adults.map(adult => (
              <SelectItem key={adult.id} value={adult.id}>
                {adult.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Split Mode Selector */}
      <div className="space-y-2">
        <Label>Split Method</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={splitMode === 'equal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSplitModeChange('equal')}
            disabled={loading}
            className="flex-1"
          >
            Equal Split
          </Button>
          <Button
            type="button"
            variant={splitMode === 'percentage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSplitModeChange('percentage')}
            disabled={loading}
            className="flex-1"
          >
            By %
          </Button>
          <Button
            type="button"
            variant={splitMode === 'amount' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSplitModeChange('amount')}
            disabled={loading}
            className="flex-1"
          >
            By Amount
          </Button>
        </div>
        {splitMode !== 'equal' && (
          <p className="text-xs text-muted-foreground">
            {splitMode === 'percentage'
              ? 'Enter percentages for each party (must sum to 100%)'
              : `Enter specific amounts for each party (must sum to ${currency} ${amount || '0.00'})`
            }
          </p>
        )}
      </div>

      {/* Split Between */}
      <div className="space-y-2">
        <Label>Split Between</Label>

        {/* Selection Controls */}
        <div className="flex items-center gap-2 mb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={loading}
            className="h-8 px-2 text-xs"
          >
            Select All
          </Button>
          <span className="text-muted-foreground">|</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            disabled={loading}
            className="h-8 px-2 text-xs"
          >
            Deselect All
          </Button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-input p-3">
          {participantGroups.map((group, gi) => {
            const memberIds = group.members.map(m => m.id)
            const selectedCount = memberIds.filter(id => selectedParticipants.includes(id)).length
            const allGroupSelected = selectedCount === memberIds.length
            const someGroupSelected = selectedCount > 0 && !allGroupSelected

            return (
              <div
                key={group.label ?? `standalone-${gi}`}
                className={group.label ? 'rounded-lg bg-muted/40 border border-border/50 p-2 mt-2 first:mt-0' : ''}
              >
                {group.label && (
                  <div
                    role="checkbox"
                    aria-checked={someGroupSelected ? 'mixed' : allGroupSelected}
                    className="flex items-center space-x-2 min-h-[36px] cursor-pointer"
                    onClick={() => handleGroupToggle(memberIds)}
                  >
                    <span
                      className={`grid place-content-center h-4 w-4 shrink-0 rounded-sm border border-primary shadow ${allGroupSelected ? 'bg-primary text-primary-foreground' : ''} ${someGroupSelected ? 'opacity-60' : ''}`}
                    >
                      {allGroupSelected && <Check className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 flex items-center gap-1">
                      <Users size={12} className="text-muted-foreground" />
                      {group.label}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({memberIds.length})
                      </span>
                    </span>
                  </div>
                )}
                {group.members.map(participant => (
                  <div key={participant.id} className={`flex items-center space-x-2 min-h-[44px] ${group.label ? 'pl-5' : ''}`}>
                    <Checkbox
                      id={`participant-${participant.id}`}
                      checked={selectedParticipants.includes(participant.id)}
                      onCheckedChange={() => handleParticipantToggle(participant.id)}
                      disabled={loading}
                    />
                    <label
                      htmlFor={`participant-${participant.id}`}
                      className="text-sm text-foreground cursor-pointer flex-1"
                    >
                      {participant.name} {participant.is_adult ? '' : '(child)'}
                    </label>
                    {splitMode !== 'equal' && selectedParticipants.includes(participant.id) && (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={participantSplitValues[participant.id] || ''}
                        onChange={(e) => handleParticipantSplitChange(participant.id, e.target.value.replace(',', '.'))}
                        placeholder={splitMode === 'percentage' ? '%' : currency}
                        pattern="[0-9]*[.,]?[0-9]*"
                        disabled={loading}
                        className="w-24 h-9"
                      />
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Proportional group toggle — only when wallet_group participants are selected */}
        {hasSelectedGroups && (
          <div className="flex items-center space-x-2 mt-3">
            <Checkbox
              id="accountForFamilySize"
              checked={accountForFamilySize}
              onCheckedChange={(checked) => setAccountForFamilySize(checked as boolean)}
              disabled={loading}
            />
            <div>
              <label htmlFor="accountForFamilySize" className="text-sm text-foreground cursor-pointer">
                Split proportionally by group size
              </label>
              <p className="text-xs text-muted-foreground">Larger groups pay more based on number of members</p>
            </div>
          </div>
        )}
      </div>

      {/* Split Preview */}
      {parseFloat(amount) > 0 && selectedParticipants.length > 0 && (() => {
        const previewDistribution: ExpenseDistribution = {
          type: 'individuals',
          participants: selectedParticipants,
          splitMode,
        }
        if (splitMode === 'percentage' || splitMode === 'amount') {
          previewDistribution.participantSplits = selectedParticipants.map(id => ({
            participantId: id,
            value: parseFloat(participantSplitValues[id] || '0')
          }))
        }

        return (
          <ExpenseSplitPreview
            amount={parseFloat(amount)}
            currency={currency}
            distribution={previewDistribution}
            participants={participants}
          />
        )
      })()}

      {/* More Details Collapsible */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          disabled={loading}
        >
          {showMoreDetails ? (
            <>
              <ChevronDown size={16} />
              <span>Less details</span>
            </>
          ) : (
            <>
              <ChevronRight size={16} />
              <span>More details</span>
            </>
          )}
        </button>

        <AnimatePresence>
          {showMoreDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 p-4 bg-accent/5 rounded-lg border border-accent/10">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Date</Label>
                  <Input
                    type="date"
                    id="expenseDate"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => setCategory(value as ExpenseCategory)}
                    disabled={loading}
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Comment */}
                <div className="space-y-2">
                  <Label htmlFor="comment">Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Additional notes..."
                    rows={2}
                    disabled={loading}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            variant="outline"
          >
            Cancel
          </Button>
        )}
      </div>
    </motion.form>
  )
}
