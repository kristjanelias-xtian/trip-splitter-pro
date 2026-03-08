// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useRef, useMemo, FormEvent, type RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'
import { CreateExpenseInput, ExpenseCategory, ExpenseDistribution, SplitMode } from '@/types/expense'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useSettlementContext } from '@/contexts/SettlementContext'
import { useAuth } from '@/contexts/AuthContext'
import { calculateBalances, formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { inferCategory } from '@/lib/categoryInference'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
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
import { buildShortNameMap } from '@/lib/participantUtils'
import { getParticipantColor } from '@/lib/participantChipColors'
import { ExpenseSplitPreview } from './ExpenseSplitPreview'

interface ExpenseFormProps {
  onSubmit: (input: CreateExpenseInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateExpenseInput>
  submitLabel?: string
  stickyFooter?: boolean
  scrollRef?: RefObject<HTMLDivElement>
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
  stickyFooter = false,
  scrollRef,
}: ExpenseFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants, getAdultParticipants } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const { settlements } = useSettlementContext()
  const { user } = useAuth()

  // When used inside a desktop Dialog (no scrollRef prop), apply useIOSScrollFix
  // internally so the scroll container still gets overscroll-behavior: contain
  const internalScrollRef = useIOSScrollFix()
  const effectiveScrollRef = scrollRef ?? internalScrollRef

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

  // Track whether the user manually picked a category (don't override with auto-inference)
  const categoryManuallySet = useRef(!!initialValues?.category)

  const handleCategoryChange = (cat: ExpenseCategory) => {
    categoryManuallySet.current = true
    setCategory(cat)
  }

  // Auto-infer category from description (debounced)
  useEffect(() => {
    if (categoryManuallySet.current) return
    const timer = setTimeout(() => {
      const inferred = inferCategory(description)
      if (inferred) setCategory(inferred)
    }, 300)
    return () => clearTimeout(timer)
  }, [description])

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
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : ['EUR', 'USD', 'GBP', 'THB']

  // Calculate balances to find suggested payer (including settlements)
  const balanceCalculation = currentTrip
    ? calculateBalances(expenses, participants, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates)
    : null
  const suggestedPayer = balanceCalculation?.suggestedNextPayer

  // Pre-fill paidBy with the authenticated user's linked adult participant
  useEffect(() => {
    if (paidBy !== '') return
    if (!user || participants.length === 0) return
    const linked = participants.find(p => p.user_id === user.id && p.is_adult)
    if (linked) setPaidBy(linked.id)
  }, [participants, user])

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
    const groups: { label: string | null; isWalletGroup: boolean; members: typeof participants }[] = []
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
      groups.push({ label, isWalletGroup: true, members })
    }
    if (standalone.length > 0) {
      groups.push({ label: grouped.size > 0 ? 'Others' : null, isWalletGroup: false, members: standalone })
    }

    return groups
  })()

  // Flat color index for each participant across all groups
  const participantColorMap = useMemo(() => {
    const map = new Map<string, number>()
    let i = 0
    for (const group of participantGroups) {
      for (const p of group.members) {
        map.set(p.id, i++)
      }
    }
    return map
  }, [participantGroups])

  const formFields = (
    <>
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

      {/* Category (inline pills) */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryChange(cat)}
              disabled={loading}
              className={`h-7 px-3 text-xs rounded-full border transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:border-primary/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Amount + Who Paid (2-col on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Amount and Currency */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                inputMode="decimal"
                id="amount"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(',', '.'))}
                className={`text-lg h-10 tabular-nums ${availableCurrencies.length === 1 ? 'pr-14' : ''}`}
                placeholder="0.00"
                pattern="[0-9]*[.,]?[0-9]*"
                required
                disabled={loading}
              />
              {availableCurrencies.length === 1 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currency}
                </span>
              )}
            </div>
            {availableCurrencies.length > 1 && (
              <div className="flex gap-1 items-center">
                {availableCurrencies.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    disabled={loading}
                    className={`h-10 px-2.5 text-xs rounded-md border transition-colors ${
                      currency === c
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Who Paid */}
        <div className="space-y-2">
          <Label htmlFor="paidBy">Who Paid?</Label>
          <Select
            value={paidBy}
            onValueChange={setPaidBy}
            disabled={loading}
          >
            <SelectTrigger id="paidBy" className="h-10">
              <SelectValue placeholder="Select person..." />
            </SelectTrigger>
            <SelectContent>
              {adults.map(adult => (
                <SelectItem key={adult.id} value={adult.id}>
                  {shortNames.get(adult.id) || adult.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestedPayer && expenses.length > 0 && (
            <button
              type="button"
              onClick={() => setPaidBy(suggestedPayer.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lightbulb size={12} className="text-accent shrink-0" />
              <span className="truncate">
                <strong className="font-medium text-foreground">{suggestedPayer.name}</strong>
                {' '}should pay next{' '}
                <span className={getBalanceColorClass(suggestedPayer.balance)}>
                  ({formatBalance(suggestedPayer.balance, currentTrip?.default_currency || 'EUR')})
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Split Mode Selector */}
      <div className="space-y-1.5">
        <Label>Split Method</Label>
        <div className="flex gap-1.5">
          {([['equal', 'Equal'], ['percentage', 'By %'], ['amount', 'By Amount']] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleSplitModeChange(mode)}
              disabled={loading}
              className={`h-7 px-3 text-xs rounded-full border transition-colors ${
                splitMode === mode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
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
        <div className="flex items-baseline justify-between">
          <Label>Split Between</Label>
          <button
            type="button"
            onClick={selectedParticipants.length === participants.length ? handleDeselectAll : handleSelectAll}
            disabled={loading}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {selectedParticipants.length === participants.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {splitMode === 'equal' ? (
          <div className="rounded-lg border border-input p-3 space-y-3">
            {participantGroups.map((group, gi) => {
              const memberIds = group.members.map(m => m.id)
              const allGroupSelected = memberIds.every(id => selectedParticipants.includes(id))

              return (
                <div key={group.label ?? `standalone-${gi}`}>
                  {group.label && (
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                      {group.isWalletGroup && (
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(memberIds)}
                          disabled={loading}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          {allGroupSelected ? `deselect ${group.label}` : `select ${group.label}`}
                        </button>
                      )}
                    </div>
                  )}
                  <div className={group.isWalletGroup
                    ? 'border-l-2 border-primary/30 pl-3 flex flex-wrap gap-2'
                    : 'flex flex-wrap gap-2'
                  }>
                    {group.members.map(participant => {
                      const isSelected = selectedParticipants.includes(participant.id)
                      const isChild = !participant.is_adult
                      const color = getParticipantColor(participantColorMap.get(participant.id) ?? 0)
                      return (
                        <button
                          key={participant.id}
                          type="button"
                          onClick={() => handleParticipantToggle(participant.id)}
                          disabled={loading}
                          className={`inline-flex items-center gap-1.5 h-8 pl-1 pr-3 text-sm rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-500 dark:border-slate-500'
                              : isChild
                                ? 'bg-background text-muted-foreground border-dashed border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                                : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                          }`}
                        >
                          <ParticipantAvatar participant={participant} size="sm" className={color.avatar} />
                          {shortNames.get(participant.id) || participant.name}
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-input p-3">
            {participantGroups.map((group, gi) => {
              const memberIds = group.members.map(m => m.id)
              const allGroupSelected = memberIds.every(id => selectedParticipants.includes(id))

              return (
                <div key={group.label ?? `standalone-${gi}`}>
                  {group.label && (
                    <div className="flex items-baseline justify-between mb-1 mt-2 first:mt-0">
                      <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                      {group.isWalletGroup && (
                        <button
                          type="button"
                          onClick={() => handleGroupToggle(memberIds)}
                          disabled={loading}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          {allGroupSelected ? `deselect ${group.label}` : `select ${group.label}`}
                        </button>
                      )}
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
                        {shortNames.get(participant.id) || participant.name} {participant.is_adult ? '' : '(child)'}
                      </label>
                      {selectedParticipants.includes(participant.id) && (
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
        )}

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
                Split equally between groups
              </label>
              <p className="text-xs text-muted-foreground">Each group pays the same share, regardless of how many members it has</p>
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
          accountForFamilySize: hasSelectedGroups ? accountForFamilySize : undefined,
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
              <div className="grid grid-cols-1 sm:grid-cols-2 items-start gap-2 p-px -m-px">
                {/* Date */}
                <div className="space-y-1">
                  <Label htmlFor="expenseDate">Date</Label>
                  <Input
                    type="date"
                    id="expenseDate"
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* Comment */}
                <div className="space-y-1">
                  <Label htmlFor="comment">Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    className="min-h-0"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Additional notes..."
                    rows={1}
                    disabled={loading}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </>
  )

  const buttons = (
    <div className={stickyFooter ? 'shrink-0 border-t border-border px-1 pt-3 flex gap-3' : 'flex gap-3 pt-2'}>
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
  )

  return (
    <motion.form
      onSubmit={handleSubmit}
      className={stickyFooter ? 'flex flex-col min-h-0 flex-1' : 'space-y-3'}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {stickyFooter ? (
        <>
          <div ref={effectiveScrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3 px-1 -mx-1">
            {formFields}
          </div>
          {buttons}
        </>
      ) : (
        <>
          {formFields}
          {buttons}
        </>
      )}
    </motion.form>
  )
}
