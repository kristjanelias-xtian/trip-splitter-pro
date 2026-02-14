import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
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
  const { participants, families, getAdultParticipants } = useParticipantContext()
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

  // Distribution state
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [accountForFamilySize, setAccountForFamilySize] = useState(true)

  // Custom split values for percentage/amount modes
  const [participantSplitValues, setParticipantSplitValues] = useState<Record<string, string>>({})
  const [familySplitValues, setFamilySplitValues] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adults = getAdultParticipants()
  const isIndividualsMode = currentTrip?.tracking_mode === 'individuals'

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : ['EUR', 'USD', 'GBP', 'THB']

  // Calculate balances to find suggested payer (including settlements)
  const balanceCalculation = currentTrip
    ? calculateBalances(expenses, participants, families, currentTrip.tracking_mode, settlements, currentTrip.default_currency, currentTrip.exchange_rates)
    : null
  const suggestedPayer = balanceCalculation?.suggestedNextPayer

  // Auto-select all participants/families on mount if not editing and trip setting allows it
  const defaultSplitAll = currentTrip?.default_split_all ?? true
  useEffect(() => {
    if (!initialValues?.distribution && defaultSplitAll) {
      if (participants.length > 0 && selectedParticipants.length === 0) {
        setSelectedParticipants(participants.map(p => p.id))
      }
      if (families.length > 0 && selectedFamilies.length === 0) {
        setSelectedFamilies(families.map(f => f.id))
      }
    }
  }, [participants, families])

  // Restore distribution selections when editing existing expense
  useEffect(() => {
    if (initialValues?.distribution) {
      const dist = initialValues.distribution

      if (dist.type === 'individuals') {
        setSelectedParticipants(dist.participants || [])
        setSelectedFamilies([])
      } else if (dist.type === 'families') {
        setSelectedFamilies(dist.families || [])
        setSelectedParticipants([])
        if ('accountForFamilySize' in dist && dist.accountForFamilySize !== undefined) {
          setAccountForFamilySize(dist.accountForFamilySize)
        }
      } else if (dist.type === 'mixed') {
        setSelectedFamilies(dist.families || [])
        setSelectedParticipants(dist.participants || [])
        if ('accountForFamilySize' in dist && dist.accountForFamilySize !== undefined) {
          setAccountForFamilySize(dist.accountForFamilySize)
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
        if ('familySplits' in dist && dist.familySplits) {
          const values: Record<string, string> = {}
          dist.familySplits.forEach(split => {
            values[split.familyId] = split.value.toString()
          })
          setFamilySplitValues(values)
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

  const handleFamilyToggle = (id: string) => {
    setSelectedFamilies(prev => {
      const newSelection = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]

      // Initialize split value for new selections in non-equal mode
      if (!prev.includes(id) && splitMode !== 'equal') {
        setFamilySplitValues(vals => ({
          ...vals,
          [id]: ''
        }))
      }

      return newSelection
    })
  }

  const handleSelectAll = () => {
    setSelectedParticipants(participants.map(p => p.id))
    setSelectedFamilies(families.map(f => f.id))
  }

  const handleDeselectAll = () => {
    setSelectedParticipants([])
    setSelectedFamilies([])
  }

  const handleParticipantSplitChange = (id: string, value: string) => {
    setParticipantSplitValues(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleFamilySplitChange = (id: string, value: string) => {
    setFamilySplitValues(prev => ({
      ...prev,
      [id]: value
    }))
  }

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode)
    // Reset custom split values when switching modes
    setParticipantSplitValues({})
    setFamilySplitValues({})
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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

    // Validate distribution
    if (isIndividualsMode) {
      if (selectedParticipants.length === 0) {
        setError('Please select at least one person to split between')
        return
      }
    } else {
      if (selectedFamilies.length === 0 && selectedParticipants.length === 0) {
        setError('Please select at least one family or person to split between')
        return
      }
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
      for (const id of selectedFamilies) {
        const value = parseFloat(familySplitValues[id] || '0')
        if (isNaN(value) || value <= 0) {
          setError('Please enter valid percentages for all selected families')
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
      for (const id of selectedFamilies) {
        const value = parseFloat(familySplitValues[id] || '0')
        if (isNaN(value) || value <= 0) {
          setError('Please enter valid amounts for all selected families')
          return
        }
        totalAmount += value
      }
      if (Math.abs(totalAmount - amountNum) > 0.01) {
        setError(`Custom amounts must sum to total (${currency} ${amountNum.toFixed(2)}). Currently: ${currency} ${totalAmount.toFixed(2)}`)
        return
      }
    }

    // Build distribution object
    let distribution: ExpenseDistribution
    if (isIndividualsMode) {
      distribution = {
        type: 'individuals',
        participants: selectedParticipants,
        splitMode,
        participantSplits: splitMode !== 'equal'
          ? selectedParticipants.map(id => ({
              participantId: id,
              value: parseFloat(participantSplitValues[id] || '0')
            }))
          : undefined
      }
    } else {
      // Families mode
      if (selectedFamilies.length > 0 && selectedParticipants.length > 0) {
        // CRITICAL: Filter out family members from participants to avoid double-counting
        const standaloneParticipants = selectedParticipants.filter(participantId => {
          const participant = participants.find(p => p.id === participantId)
          // Only include participants who are NOT in any selected family
          if (!participant) return false

          // If participant has no family, they're standalone
          if (participant.family_id === null) return true

          // If participant belongs to a selected family, exclude them
          return !selectedFamilies.includes(participant.family_id)
        })

        distribution = {
          type: 'mixed',
          families: selectedFamilies,
          participants: standaloneParticipants,
          splitMode,
          accountForFamilySize, // Include toggle value
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
            : undefined
        }
      } else if (selectedFamilies.length > 0) {
        distribution = {
          type: 'families',
          families: selectedFamilies,
          splitMode,
          accountForFamilySize, // Include toggle value
          familySplits: splitMode !== 'equal'
            ? selectedFamilies.map(id => ({
                familyId: id,
                value: parseFloat(familySplitValues[id] || '0')
              }))
            : undefined
        }
      } else {
        distribution = {
          type: 'individuals',
          participants: selectedParticipants,
          splitMode,
          participantSplits: splitMode !== 'equal'
            ? selectedParticipants.map(id => ({
                participantId: id,
                value: parseFloat(participantSplitValues[id] || '0')
              }))
            : undefined
        }
      }
    }

    if (!currentTrip) {
      setError('No trip selected')
      return
    }

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
      setSelectedFamilies(families.map(f => f.id))
      setShowMoreDetails(false)
    } catch (err) {
      setError('Failed to save expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
          {error}
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
            type="number"
            id="amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 text-2xl h-14 tabular-nums"
            placeholder="0.00"
            step="0.01"
            min="0.01"
            required
            disabled={loading}
          />
          <Select
            value={currency}
            onValueChange={setCurrency}
            disabled={loading}
          >
            <SelectTrigger className="w-24">
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
              {!isIndividualsMode && suggestedPayer.isFamily && (
                <Badge variant="soft">Family</Badge>
              )}
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

      {/* Account for Family Size Toggle */}
      {selectedFamilies.length > 0 && splitMode === 'equal' && (
        <div className="space-y-2 p-3 bg-accent/5 rounded-lg border border-accent/10">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accountForFamilySize"
              checked={accountForFamilySize}
              onCheckedChange={(checked) => setAccountForFamilySize(checked as boolean)}
              disabled={loading}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="accountForFamilySize"
                className="text-sm font-medium text-foreground cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Account for family size
              </label>
              <p className="text-xs text-muted-foreground">
                {accountForFamilySize
                  ? 'Families pay proportionally by number of people (e.g., family of 4 pays 2× family of 2)'
                  : 'All families pay equally regardless of size'}
              </p>
            </div>
          </div>
        </div>
      )}


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

        {isIndividualsMode ? (
          // Individuals mode - show participants
          <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-input p-3">
            {participants.map(participant => (
              <div key={participant.id} className="flex items-center space-x-2 min-h-[44px]">
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
                    type="number"
                    value={participantSplitValues[participant.id] || ''}
                    onChange={(e) => handleParticipantSplitChange(participant.id, e.target.value)}
                    placeholder={splitMode === 'percentage' ? '%' : currency}
                    step={splitMode === 'percentage' ? '0.1' : '0.01'}
                    min="0"
                    disabled={loading}
                    className="w-24 h-9"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          // Families mode - show families and standalone individuals only
          <div className="space-y-3">
            {families.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Families</p>
                <div className="space-y-2 rounded-lg border border-input p-3">
                  {families.map(family => (
                    <div key={family.id} className="flex items-center space-x-2 min-h-[44px]">
                      <Checkbox
                        id={`family-${family.id}`}
                        checked={selectedFamilies.includes(family.id)}
                        onCheckedChange={() => handleFamilyToggle(family.id)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={`family-${family.id}`}
                        className="text-sm text-foreground cursor-pointer flex-1"
                      >
                        {family.family_name} ({family.adults} adults
                        {family.children > 0 && `, ${family.children} children`})
                      </label>
                      {splitMode !== 'equal' && selectedFamilies.includes(family.id) && (
                        <Input
                          type="number"
                          value={familySplitValues[family.id] || ''}
                          onChange={(e) => handleFamilySplitChange(family.id, e.target.value)}
                          placeholder={splitMode === 'percentage' ? '%' : currency}
                          step={splitMode === 'percentage' ? '0.1' : '0.01'}
                          min="0"
                          disabled={loading}
                          className="w-24 h-9"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Standalone individuals (not in any family) */}
            {(() => {
              const standaloneParticipants = participants.filter(p => p.family_id === null)
              return standaloneParticipants.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Standalone Individuals</p>
                  <div className="space-y-2 rounded-lg border border-input p-3">
                    {standaloneParticipants.map(participant => (
                      <div key={participant.id} className="flex items-center space-x-2 min-h-[44px]">
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
                            type="number"
                            value={participantSplitValues[participant.id] || ''}
                            onChange={(e) => handleParticipantSplitChange(participant.id, e.target.value)}
                            placeholder={splitMode === 'percentage' ? '%' : currency}
                            step={splitMode === 'percentage' ? '0.1' : '0.01'}
                            min="0"
                            disabled={loading}
                            className="w-24 h-9"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
            {/* All individuals - allows selecting specific people from families */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Individuals</p>
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-input p-3">
                {participants.map(participant => (
                  <div key={participant.id} className="flex items-center space-x-2 min-h-[44px]">
                    <Checkbox
                      id={`individual-${participant.id}`}
                      checked={selectedParticipants.includes(participant.id)}
                      onCheckedChange={() => handleParticipantToggle(participant.id)}
                      disabled={loading}
                    />
                    <label
                      htmlFor={`individual-${participant.id}`}
                      className="text-sm text-foreground cursor-pointer flex-1"
                    >
                      {participant.name} {participant.is_adult ? '' : '(child)'}
                      {participant.family_id && (() => {
                        const family = families.find(f => f.id === participant.family_id)
                        return family ? ` (${family.family_name})` : ''
                      })()}
                    </label>
                    {splitMode !== 'equal' && selectedParticipants.includes(participant.id) && (
                      <Input
                        type="number"
                        value={participantSplitValues[participant.id] || ''}
                        onChange={(e) => handleParticipantSplitChange(participant.id, e.target.value)}
                        placeholder={splitMode === 'percentage' ? '%' : currency}
                        step={splitMode === 'percentage' ? '0.1' : '0.01'}
                        min="0"
                        disabled={loading}
                        className="w-24 h-9"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Split Preview */}
      {parseFloat(amount) > 0 && (selectedParticipants.length > 0 || selectedFamilies.length > 0) && (() => {
        // Build distribution object for preview
        const distributionType: ExpenseDistribution['type'] =
          selectedFamilies.length > 0 && selectedParticipants.length > 0
            ? 'mixed'
            : selectedFamilies.length > 0
            ? 'families'
            : 'individuals'

        let previewDistribution: ExpenseDistribution

        if (distributionType === 'individuals') {
          const dist: ExpenseDistribution = {
            type: 'individuals',
            participants: selectedParticipants,
            splitMode,
          }
          if (splitMode === 'percentage' || splitMode === 'amount') {
            dist.participantSplits = selectedParticipants.map(id => ({
              participantId: id,
              value: parseFloat(participantSplitValues[id] || '0')
            }))
          }
          previewDistribution = dist
        } else if (distributionType === 'families') {
          const dist: ExpenseDistribution = {
            type: 'families',
            families: selectedFamilies,
            splitMode,
            accountForFamilySize, // Include the toggle value
          }
          if (splitMode === 'percentage' || splitMode === 'amount') {
            dist.familySplits = selectedFamilies.map(id => ({
              familyId: id,
              value: parseFloat(familySplitValues[id] || '0')
            }))
          }
          previewDistribution = dist
        } else {
          const dist: ExpenseDistribution = {
            type: 'mixed',
            families: selectedFamilies,
            participants: selectedParticipants,
            splitMode,
            accountForFamilySize, // Include the toggle value
          }
          if (splitMode === 'percentage' || splitMode === 'amount') {
            dist.familySplits = selectedFamilies.map(id => ({
              familyId: id,
              value: parseFloat(familySplitValues[id] || '0')
            }))
            dist.participantSplits = selectedParticipants.map(id => ({
              participantId: id,
              value: parseFloat(participantSplitValues[id] || '0')
            }))
          }
          previewDistribution = dist
        }

        return (
          <ExpenseSplitPreview
            amount={parseFloat(amount)}
            currency={currency}
            distribution={previewDistribution}
            participants={participants}
            families={families}
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
