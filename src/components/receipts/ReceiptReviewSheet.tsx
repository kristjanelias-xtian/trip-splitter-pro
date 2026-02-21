import { useState, useEffect, useMemo } from 'react'
import { Loader2, Users, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { useTripContext } from '@/contexts/TripContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { ExtractedItem } from '@/types/receipt'
import { IndividualsDistribution, ExpenseCategory } from '@/types/expense'
import { Participant } from '@/types/participant'

interface ReceiptReviewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  merchant: string | null
  items: ExtractedItem[]
  extractedTotal: number | null
  currency: string
  onDone: () => void
}

// Participant chip color palette (consistent across rerenders)
const CHIP_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-teal-500',
]

function getChipColor(index: number) {
  return CHIP_COLORS[index % CHIP_COLORS.length]
}

function participantInitial(name: string) {
  return name.charAt(0).toUpperCase()
}

interface EditableItem {
  name: string
  price: string // string for controlled input
  qty: number
  assignedIds: Set<string>
}

function buildDistribution(
  editableItems: EditableItem[],
  confirmedTotal: number,
  tipAmount: number
): { distribution: IndividualsDistribution; totalAmount: number } {
  const rawShares: Record<string, number> = {}

  for (const item of editableItems) {
    const price = parseFloat(item.price) || 0
    const assignedArr = Array.from(item.assignedIds)
    if (assignedArr.length === 0 || price === 0) continue
    const sharePerPerson = price / assignedArr.length
    for (const pid of assignedArr) {
      rawShares[pid] = (rawShares[pid] ?? 0) + sharePerPerson
    }
  }

  const includedIds = Object.keys(rawShares)
  if (includedIds.length === 0) {
    return {
      distribution: { type: 'individuals', participants: [], splitMode: 'amount', participantSplits: [] },
      totalAmount: confirmedTotal + tipAmount,
    }
  }

  const rawTotal = Object.values(rawShares).reduce((a, b) => a + b, 0)
  const scaleFactor = rawTotal > 0 ? confirmedTotal / rawTotal : 1

  // Scale shares to match confirmed_total
  const participantSplits = includedIds.map(pid => ({
    participantId: pid,
    value: Math.round(rawShares[pid] * scaleFactor * 100) / 100,
  }))

  // Fix rounding on last participant
  const sumScaled = participantSplits.reduce((a, b) => a + b.value, 0)
  const roundingAdj = Math.round((confirmedTotal - sumScaled) * 100) / 100
  participantSplits[participantSplits.length - 1].value += roundingAdj

  // Add tip equally
  const totalAmount = confirmedTotal + tipAmount
  if (tipAmount > 0) {
    const tipPerPerson = Math.round((tipAmount / includedIds.length) * 100) / 100
    for (const split of participantSplits) {
      split.value = Math.round((split.value + tipPerPerson) * 100) / 100
    }
    // Fix tip rounding
    const sumWithTip = participantSplits.reduce((a, b) => a + b.value, 0)
    const tipAdj = Math.round((totalAmount - sumWithTip) * 100) / 100
    participantSplits[participantSplits.length - 1].value += tipAdj
  }

  return {
    distribution: {
      type: 'individuals',
      participants: includedIds,
      splitMode: 'amount',
      participantSplits,
    },
    totalAmount,
  }
}

export function ReceiptReviewSheet({
  open,
  onOpenChange,
  taskId,
  merchant,
  items: initialItems,
  extractedTotal,
  currency,
  onDone,
}: ReceiptReviewSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { participants, getAdultParticipants } = useParticipantContext()
  const { createExpense } = useExpenseContext()
  const { completeReceiptTask } = useReceiptContext()
  const { updateTrip } = useTripContext()
  const { user } = useAuth()
  const { toast } = useToast()

  const adultParticipants = getAdultParticipants()
  const baseCurrency = currentTrip?.default_currency ?? 'EUR'
  const knownCurrencies = useMemo(
    () => [baseCurrency, ...Object.keys(currentTrip?.exchange_rates ?? {})],
    [baseCurrency, currentTrip?.exchange_rates]
  )

  // Editable items state
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [confirmedTotal, setConfirmedTotal] = useState('')
  const [tipAmount, setTipAmount] = useState('0')
  const [paidBy, setPaidBy] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Food')
  const [merchantName, setMerchantName] = useState('')
  const [activeCurrency, setActiveCurrency] = useState(currency)
  const [exchangeRate, setExchangeRate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAllItems, setShowAllItems] = useState(true)

  // Currency options: trip's known currencies + extracted currency if not already present
  const currencyOptions = useMemo(() => {
    const opts = [...knownCurrencies]
    if (activeCurrency && !opts.includes(activeCurrency)) opts.push(activeCurrency)
    return opts
  }, [knownCurrencies, activeCurrency])

  // True when user has selected a currency not yet in the trip's exchange rates
  const currencyIsUnknown =
    activeCurrency !== baseCurrency && !knownCurrencies.includes(activeCurrency)

  const exchangeRateFloat = parseFloat(exchangeRate)

  // Reset state when sheet opens with new data
  useEffect(() => {
    if (!open) return

    const defaultPayerId = adultParticipants.find(p => p.user_id === user?.id)?.id ?? adultParticipants[0]?.id ?? ''

    setEditableItems(
      initialItems.map(item => ({
        name: item.name,
        price: item.price.toFixed(2),
        qty: item.qty,
        assignedIds: new Set<string>(),
      }))
    )
    setConfirmedTotal(extractedTotal != null ? extractedTotal.toFixed(2) : '')
    setTipAmount('0')
    setPaidBy(defaultPayerId)
    setMerchantName(merchant ?? '')
    setCategory('Food')
    setActiveCurrency(currency)
    setExchangeRate('')
    setShowAllItems(true)
  }, [open, taskId])

  // Toggle a participant for an item
  const toggleParticipant = (itemIndex: number, participantId: string) => {
    setEditableItems(prev =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item
        const next = new Set(item.assignedIds)
        if (next.has(participantId)) {
          next.delete(participantId)
        } else {
          next.add(participantId)
        }
        return { ...item, assignedIds: next }
      })
    )
  }

  // Toggle all participants for an item
  const toggleAll = (itemIndex: number) => {
    setEditableItems(prev =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item
        const allIds = participants.map(p => p.id)
        const allAssigned = allIds.every(id => item.assignedIds.has(id))
        return {
          ...item,
          assignedIds: allAssigned ? new Set() : new Set(allIds),
        }
      })
    )
  }

  const updateItemName = (index: number, name: string) => {
    setEditableItems(prev => prev.map((item, i) => (i === index ? { ...item, name } : item)))
  }

  const updateItemPrice = (index: number, price: string) => {
    setEditableItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, price: price.replace(',', '.') } : item
      )
    )
  }

  const itemsTotal = useMemo(
    () => editableItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0),
    [editableItems]
  )

  const totalFloat = parseFloat(confirmedTotal) || 0
  const tipFloat = parseFloat(tipAmount) || 0
  const totalExpense = totalFloat + tipFloat

  const unassignedItems = editableItems.filter(item => item.assignedIds.size === 0 && parseFloat(item.price) > 0)
  const canSubmit =
    paidBy &&
    totalFloat > 0 &&
    unassignedItems.length === 0 &&
    editableItems.some(item => item.assignedIds.size > 0) &&
    (!currencyIsUnknown || (exchangeRateFloat > 0))

  const handleSubmit = async () => {
    if (!currentTrip || !canSubmit) return
    setSubmitting(true)

    try {
      // If the currency is new to this trip, save its exchange rate first
      if (currencyIsUnknown && exchangeRateFloat > 0) {
        const updatedRates = {
          ...(currentTrip.exchange_rates ?? {}),
          [activeCurrency]: exchangeRateFloat,
        }
        await updateTrip(currentTrip.id, { exchange_rates: updatedRates })
      }

      const { distribution, totalAmount } = buildDistribution(editableItems, totalFloat, tipFloat)

      const description = merchantName.trim()
        ? `Receipt: ${merchantName.trim()}`
        : 'Receipt'

      const expense = await createExpense({
        trip_id: currentTrip.id,
        description,
        amount: totalAmount,
        currency: activeCurrency,
        paid_by: paidBy,
        distribution,
        category,
        expense_date: new Date().toISOString().split('T')[0],
      })

      if (!expense) {
        toast({ title: 'Failed to create expense', variant: 'destructive' })
        setSubmitting(false)
        return
      }

      await completeReceiptTask(taskId, expense.id)

      toast({
        title: 'Receipt added',
        description: `${description} — ${activeCurrency} ${totalAmount.toFixed(2)}`,
      })

      onOpenChange(false)
      onDone()
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] flex flex-col p-0">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <SheetHeader>
            <SheetTitle>Review Receipt</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Merchant + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="merchant" className="text-xs">Merchant</Label>
              <Input
                id="merchant"
                value={merchantName}
                onChange={e => setMerchantName(e.target.value)}
                placeholder="Restaurant, store..."
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category" className="text-xs">Category</Label>
              <Select value={category} onValueChange={val => setCategory(val as ExpenseCategory)}>
                <SelectTrigger id="category" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Accommodation">Accommodation</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Activities">Activities</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Paid by */}
          <div className="space-y-1">
            <Label htmlFor="paidby" className="text-xs">Paid by</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger id="paidby" className="h-9 text-sm">
                <SelectValue placeholder="Who paid?" />
              </SelectTrigger>
              <SelectContent>
                {adultParticipants.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <button
              className="flex items-center justify-between w-full text-sm font-medium text-foreground"
              onClick={() => setShowAllItems(v => !v)}
            >
              <span>Items ({editableItems.length})</span>
              {showAllItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAllItems && (
              <div className="space-y-3">
                {editableItems.map((item, i) => (
                  <ItemRow
                    key={i}
                    index={i}
                    item={item}
                    participants={participants}
                    onNameChange={name => updateItemName(i, name)}
                    onPriceChange={price => updateItemPrice(i, price)}
                    onToggleParticipant={pid => toggleParticipant(i, pid)}
                    onToggleAll={() => toggleAll(i)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Unassigned warning */}
          {unassignedItems.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                {unassignedItems.length} item{unassignedItems.length > 1 ? 's' : ''} not assigned to anyone
              </span>
            </div>
          )}

          {/* Totals */}
          <div className="border border-border rounded-lg p-3 space-y-3">
            {/* Currency selector */}
            <div className="space-y-1">
              <Label htmlFor="receipt-currency" className="text-xs">Currency</Label>
              <Select value={activeCurrency} onValueChange={setActiveCurrency}>
                <SelectTrigger id="receipt-currency" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exchange rate prompt for unknown currencies */}
            {currencyIsUnknown && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{activeCurrency} is not in your trip's currencies. Enter the exchange rate to convert balances correctly.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">1 {baseCurrency} =</span>
                  <Input
                    inputMode="decimal"
                    value={exchangeRate}
                    onChange={e => setExchangeRate(e.target.value.replace(',', '.'))}
                    placeholder="0.00"
                    className="h-9 text-sm"
                  />
                  <span className="text-sm font-medium">{activeCurrency}</span>
                </div>
                <p className="text-xs text-muted-foreground">This rate will be saved to your trip.</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Items total</span>
              <span>{activeCurrency} {itemsTotal.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="confirmed-total" className="text-xs">Total charged ({activeCurrency})</Label>
                <Input
                  id="confirmed-total"
                  inputMode="decimal"
                  value={confirmedTotal}
                  onChange={e => setConfirmedTotal(e.target.value.replace(',', '.'))}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tip" className="text-xs">Tip ({activeCurrency})</Label>
                <Input
                  id="tip"
                  inputMode="decimal"
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value.replace(',', '.'))}
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between font-semibold text-sm border-t border-border pt-2">
              <span>Total expense</span>
              <span>{activeCurrency} {totalExpense.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="px-4 py-3 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Adding expense...
              </>
            ) : (
              `Add Expense — ${activeCurrency} ${totalExpense.toFixed(2)}`
            )}
          </Button>
          {!canSubmit && totalFloat > 0 && unassignedItems.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Assign all items to submit
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface ItemRowProps {
  index: number
  item: EditableItem
  participants: Participant[]
  onNameChange: (name: string) => void
  onPriceChange: (price: string) => void
  onToggleParticipant: (pid: string) => void
  onToggleAll: () => void
}

function ItemRow({
  index: _index,
  item,
  participants,
  onNameChange,
  onPriceChange,
  onToggleParticipant,
  onToggleAll,
}: ItemRowProps) {
  const allAssigned = participants.length > 0 && participants.every(p => item.assignedIds.has(p.id))

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      {/* Name + Price */}
      <div className="flex gap-2 items-center">
        <Input
          value={item.name}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Item name"
          className="flex-1 h-8 text-sm"
        />
        <div className="relative">
          <Input
            inputMode="decimal"
            value={item.price}
            onChange={e => onPriceChange(e.target.value)}
            placeholder="0.00"
            className="w-20 h-8 text-sm text-right"
          />
        </div>
      </div>

      {/* Participant chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {participants.map((p, pi) => {
          const assigned = item.assignedIds.has(p.id)
          return (
            <button
              key={p.id}
              onClick={() => onToggleParticipant(p.id)}
              className={[
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
                assigned
                  ? `${getChipColor(pi)} text-white`
                  : 'bg-muted text-muted-foreground border border-border',
              ].join(' ')}
              title={p.name}
            >
              {participantInitial(p.name)}
              {p.name.split(' ')[0]}
            </button>
          )
        })}

        {/* "All" shortcut */}
        {participants.length > 1 && (
          <button
            onClick={onToggleAll}
            className={[
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors border',
              allAssigned
                ? 'bg-foreground text-background border-foreground'
                : 'bg-muted text-muted-foreground border-border',
            ].join(' ')}
            title="Toggle all"
          >
            <Users size={10} />
            All
          </button>
        )}
      </div>
    </div>
  )
}
