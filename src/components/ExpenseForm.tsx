import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react'
import { CreateExpenseInput, ExpenseCategory, ExpenseDistribution } from '@/types/expense'
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
  const [currency, setCurrency] = useState(initialValues?.currency || 'EUR')
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

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adults = getAdultParticipants()
  const isIndividualsMode = currentTrip?.tracking_mode === 'individuals'

  // Calculate balances to find suggested payer (including settlements)
  const balanceCalculation = currentTrip
    ? calculateBalances(expenses, participants, families, currentTrip.tracking_mode, settlements)
    : null
  const suggestedPayer = balanceCalculation?.suggestedNextPayer

  // Auto-select all participants/families on mount if not editing
  useEffect(() => {
    if (!initialValues && participants.length > 0 && selectedParticipants.length === 0) {
      setSelectedParticipants(participants.map(p => p.id))
    }
    if (!initialValues && families.length > 0 && selectedFamilies.length === 0) {
      setSelectedFamilies(families.map(f => f.id))
    }
  }, [participants, families])

  const handleParticipantToggle = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleFamilyToggle = (id: string) => {
    setSelectedFamilies(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
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

    // Build distribution object
    let distribution: ExpenseDistribution
    if (isIndividualsMode) {
      distribution = {
        type: 'individuals',
        participants: selectedParticipants,
      }
    } else {
      // Families mode
      if (selectedFamilies.length > 0 && selectedParticipants.length > 0) {
        distribution = {
          type: 'mixed',
          families: selectedFamilies,
          participants: selectedParticipants,
        }
      } else if (selectedFamilies.length > 0) {
        distribution = {
          type: 'families',
          families: selectedFamilies,
        }
      } else {
        distribution = {
          type: 'individuals',
          participants: selectedParticipants,
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
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
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
                    {formatBalance(suggestedPayer.balance, currency)}
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

      {/* Split Between */}
      <div className="space-y-2">
        <Label>Split Between</Label>

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
              </div>
            ))}
          </div>
        ) : (
          // Families mode - show families and individuals
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
                    </div>
                  ))}
                </div>
              </div>
            )}
            {participants.filter(p => !p.family_id).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Individual Participants</p>
                <div className="space-y-2 rounded-lg border border-input p-3">
                  {participants
                    .filter(p => !p.family_id)
                    .map(participant => (
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
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
