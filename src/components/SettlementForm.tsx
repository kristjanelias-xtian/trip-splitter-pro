import { useState, FormEvent, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CreateSettlementInput } from '@/types/settlement'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useScrollIntoView } from '@/hooks/useScrollIntoView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'

interface SettlementFormProps {
  onSubmit: (input: CreateSettlementInput) => Promise<void>
  onCancel?: () => void
  initialAmount?: number
  initialNote?: string
  initialFromId?: string
  initialToId?: string
}

export function SettlementForm({ onSubmit, onCancel, initialAmount, initialNote, initialFromId, initialToId }: SettlementFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants, families } = useParticipantContext()

  const [fromParticipantId, setFromParticipantId] = useState(initialFromId || '')
  const [toParticipantId, setToParticipantId] = useState(initialToId || '')
  const [amount, setAmount] = useState(initialAmount?.toString() || '')
  const [currency, setCurrency] = useState(currentTrip?.default_currency || 'EUR')
  const [settlementDate, setSettlementDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [note, setNote] = useState(initialNote || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  // Keyboard detection for mobile
  const formRef = useRef<HTMLFormElement>(null)
  const keyboard = useKeyboardHeight()

  useScrollIntoView(formRef, {
    enabled: keyboard.isVisible,
    offset: 20,
  })

  // Update form when initial values change
  useEffect(() => {
    if (initialAmount !== undefined) {
      setAmount(initialAmount.toString())
    }
  }, [initialAmount])

  useEffect(() => {
    if (initialNote !== undefined) {
      setNote(initialNote)
    }
  }, [initialNote])

  useEffect(() => {
    if (initialFromId !== undefined) {
      setFromParticipantId(initialFromId)
    }
  }, [initialFromId])

  useEffect(() => {
    if (initialToId !== undefined) {
      setToParticipantId(initialToId)
    }
  }, [initialToId])

  const isIndividualsMode = currentTrip?.tracking_mode === 'individuals'

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : ['EUR', 'USD', 'GBP', 'THB']

  // Get all adults for selection
  // Note: Settlements always use participant IDs (adults), even in families mode
  // In families mode, we show which family they belong to
  const getAdults = () => {
    const adults = participants.filter(p => p.is_adult)

    if (isIndividualsMode) {
      return adults.map(p => ({
        id: p.id,
        name: p.name,
        familyName: null
      }))
    } else {
      // In families mode, show adults with their family name
      return adults.map(p => {
        const family = families.find(f => f.id === p.family_id)
        return {
          id: p.id,
          name: p.name,
          familyName: family?.family_name || null
        }
      })
    }
  }

  const adultsForSelection = getAdults()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fromParticipantId) {
      setError('Please select who paid')
      return
    }

    if (!toParticipantId) {
      setError('Please select who received the payment')
      return
    }

    if (fromParticipantId === toParticipantId) {
      setError('Cannot record a payment to yourself')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    if (!currentTrip) {
      setError('No trip selected')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        trip_id: currentTrip.id,
        from_participant_id: fromParticipantId,
        to_participant_id: toParticipantId,
        amount: amountNum,
        currency,
        settlement_date: settlementDate,
        note: note.trim() || undefined,
      })

      // Reset form
      setFromParticipantId('')
      setToParticipantId('')
      setAmount('')
      setNote('')
      setSettlementDate(new Date().toISOString().split('T')[0])
    } catch (err) {
      setError('Failed to record settlement. Please try again.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  return (
    <motion.form
      ref={formRef}
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

      {/* From Participant */}
      <div className="space-y-2">
        <Label htmlFor="fromParticipant">Who Paid? (From)</Label>
        <Select
          value={fromParticipantId}
          onValueChange={setFromParticipantId}
          disabled={loading}
        >
          <SelectTrigger id="fromParticipant">
            <SelectValue placeholder="Select person..." />
          </SelectTrigger>
          <SelectContent>
            {adultsForSelection.map(adult => (
              <SelectItem key={adult.id} value={adult.id}>
                {adult.familyName ? `${adult.name} (${adult.familyName})` : adult.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* To Participant */}
      <div className="space-y-2">
        <Label htmlFor="toParticipant">Who Received? (To)</Label>
        <Select
          value={toParticipantId}
          onValueChange={setToParticipantId}
          disabled={loading}
        >
          <SelectTrigger id="toParticipant">
            <SelectValue placeholder="Select person..." />
          </SelectTrigger>
          <SelectContent>
            {adultsForSelection.map(adult => (
              <SelectItem key={adult.id} value={adult.id}>
                {adult.familyName ? `${adult.name} (${adult.familyName})` : adult.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visual Arrow Indicator */}
      {fromParticipantId && toParticipantId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-accent/10 border border-accent/20 rounded-lg p-4"
        >
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="text-center">
              <span className="font-semibold text-foreground block">
                {adultsForSelection.find(a => a.id === fromParticipantId)?.name}
              </span>
              {adultsForSelection.find(a => a.id === fromParticipantId)?.familyName && (
                <span className="text-xs text-muted-foreground">
                  ({adultsForSelection.find(a => a.id === fromParticipantId)?.familyName})
                </span>
              )}
            </div>
            <ArrowRight size={24} className="text-accent flex-shrink-0" />
            <div className="text-center">
              <span className="font-semibold text-foreground block">
                {adultsForSelection.find(a => a.id === toParticipantId)?.name}
              </span>
              {adultsForSelection.find(a => a.id === toParticipantId)?.familyName && (
                <span className="text-xs text-muted-foreground">
                  ({adultsForSelection.find(a => a.id === toParticipantId)?.familyName})
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

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

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="settlementDate">Settlement Date</Label>
        <Input
          type="date"
          id="settlementDate"
          value={settlementDate}
          onChange={e => setSettlementDate(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="note">Note (Optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g., Paid in cash, Partial payment, etc."
          rows={2}
          disabled={loading}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Recording...' : 'Record Settlement'}
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
