import { useState, FormEvent, useRef, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clipboard, Check, ExternalLink, Lightbulb } from 'lucide-react'
import { CreateSettlementInput } from '@/types/settlement'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useParticipantContext } from '@/contexts/ParticipantContext'

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
import { buildShortNameMap } from '@/lib/participantUtils'

interface SettlementFormProps {
  onSubmit: (input: CreateSettlementInput) => Promise<void>
  onCancel?: () => void
  initialAmount?: number
  initialNote?: string
  initialFromId?: string
  initialToId?: string
  recipientBankDetails?: { holder: string; iban: string } | null
  recipientName?: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors shrink-0"
    >
      {copied ? (
        <><Check size={12} className="text-positive" /> Copied!</>
      ) : (
        <><Clipboard size={12} /> Copy</>
      )}
    </button>
  )
}

const BANK_SHORTCUTS = [
  {
    name: 'Swedbank',
    url: 'https://www.swedbank.ee/private/d2d/payments2/smartPayment',
    badgeClass: 'bg-orange-500 text-white font-bold',
    badgeText: 'SW',
  },
  {
    name: 'LHV',
    url: 'https://www.lhv.ee/en/internetbank',
    badgeClass: 'bg-black text-white font-bold',
    badgeText: 'LHV',
  },
  {
    name: 'SEB',
    url: 'https://e.seb.ee/web/ipank',
    badgeClass: 'bg-green-600 text-white font-bold',
    badgeText: 'SEB',
  },
]

export function SettlementForm({ onSubmit, onCancel, initialAmount, initialNote, initialFromId, initialToId, recipientBankDetails, recipientName }: SettlementFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants } = useParticipantContext()

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
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

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

  // Compute available currencies from trip settings
  const availableCurrencies = currentTrip
    ? [currentTrip.default_currency, ...Object.keys(currentTrip.exchange_rates || {})]
    : ['EUR', 'USD', 'GBP', 'THB']

  // Get all adults for selection
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])
  const adultsForSelection = participants
    .filter(p => p.is_adult)
    .map(p => ({
      id: p.id,
      name: shortNames.get(p.id) || p.name,
      groupName: p.wallet_group || null,
    }))

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
      setError(err instanceof Error ? err.message : 'Failed to record settlement.')
      setErrorDetail(err instanceof Error ? (err.stack ?? null) : String(err))
    } finally {
      if (isMounted.current) setLoading(false)
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
          {errorDetail && (
            <pre className="mt-2 text-xs whitespace-pre-wrap break-all opacity-80">{errorDetail}</pre>
          )}
        </motion.div>
      )}

      {/* From / To */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="fromParticipant">From</Label>
          <Select
            value={fromParticipantId}
            onValueChange={setFromParticipantId}
            disabled={loading}
          >
            <SelectTrigger id="fromParticipant">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {adultsForSelection.map(adult => (
                <SelectItem key={adult.id} value={adult.id}>
                  {adult.groupName ? `${adult.name} (${adult.groupName})` : adult.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toParticipant">To</Label>
          <Select
            value={toParticipantId}
            onValueChange={setToParticipantId}
            disabled={loading}
          >
            <SelectTrigger id="toParticipant">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {adultsForSelection.map(adult => (
                <SelectItem key={adult.id} value={adult.id}>
                  {adult.groupName ? `${adult.name} (${adult.groupName})` : adult.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amount + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="decimal"
              id="amount"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(',', '.'))}
              className="flex-1 text-lg tabular-nums"
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
              <SelectTrigger className="w-20">
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

        <div className="space-y-2">
          <Label htmlFor="settlementDate">Date</Label>
          <Input
            type="date"
            id="settlementDate"
            value={settlementDate}
            onChange={e => setSettlementDate(e.target.value)}
            disabled={loading}
          />
        </div>
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

      {/* Pay Now Helper Panel */}
      {recipientBankDetails?.iban && (
        <div className="space-y-3 pt-2">
          <div className="border-t border-border" />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Payment details
          </p>

          {/* Name row */}
          {recipientBankDetails.holder && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[11px] uppercase text-muted-foreground">Name</p>
                <p className="text-sm font-semibold text-foreground truncate">
                  {recipientBankDetails.holder}
                </p>
              </div>
              <CopyButton value={recipientBankDetails.holder} />
            </div>
          )}

          {/* IBAN row */}
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[11px] uppercase text-muted-foreground">
                {recipientName ? `${recipientName}'s IBAN` : 'Recipient IBAN'}
              </p>
              <p className="font-mono text-sm font-semibold text-foreground truncate">
                {recipientBankDetails.iban}
              </p>
            </div>
            <CopyButton value={recipientBankDetails.iban} />
          </div>

          {/* Amount row */}
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[11px] uppercase text-muted-foreground">
                Amount ({currency})
              </p>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {parseFloat(amount || '0').toFixed(2)}
              </p>
            </div>
            <CopyButton value={parseFloat(amount || '0').toFixed(2)} />
          </div>

          {/* Notice */}
          <div className="flex gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <Lightbulb size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Banks don't allow apps to pre-fill payments directly. Copy the details above and paste them in your bank app — or tap a shortcut below to open it.
            </p>
          </div>

          {/* Bank shortcuts */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Open your bank
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BANK_SHORTCUTS.map(bank => (
              <a
                key={bank.name}
                href={bank.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs ${bank.badgeClass}`}>
                  {bank.badgeText}
                </span>
                <span className="text-xs font-medium text-foreground flex items-center gap-1">
                  {bank.name}
                  <ExternalLink size={10} className="text-muted-foreground" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Confirming...' : 'Confirm Payment'}
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
