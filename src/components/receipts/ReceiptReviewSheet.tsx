// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, ChevronDown, ChevronUp, AlertCircle, Image } from 'lucide-react'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useScrollIntoView } from '@/hooks/useScrollIntoView'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
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
import { ExtractedItem, MappedItem, LegacyMappedItem } from '@/types/receipt'
import { ExpenseCategory } from '@/types/expense'
import { buildShortNameMap } from '@/lib/participantUtils'
import { ensureItemIds, normalizeMappedItems, mappedItemsToAllocations, allocationsToMappedItems } from '@/lib/mappedItemsAdapter'
import { buildReceiptDistribution, distributeEvenly, type Allocations } from '@/lib/receiptDistribution'
import { useReceiptAllocationView, useReceiptCarryForward } from '@/hooks/useReceiptAllocationView'
import { ItemRow } from './ItemRow'
import { PersonRow } from './PersonRow'

interface ReceiptReviewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  merchant: string | null
  items: ExtractedItem[]
  extractedTotal: number | null
  currency: string
  imagePath?: string | null
  extractedCategory?: string | null
  existingExpenseId?: string
  mappedItems?: (MappedItem | LegacyMappedItem)[] | null
  savedTipAmount?: number | null
  onDone: () => void
}

interface EditableItem {
  id: string
  name: string
  nameOriginal?: string
  price: string
  qty: number
  manuallySet: boolean
}

export function ReceiptReviewSheet({
  open,
  onOpenChange,
  taskId,
  merchant,
  items: initialItems,
  extractedTotal,
  currency,
  imagePath,
  extractedCategory,
  existingExpenseId,
  mappedItems,
  savedTipAmount,
  onDone,
}: ReceiptReviewSheetProps) {
  const { t } = useTranslation()
  const keyboard = useKeyboardHeight()
  const contentRef = useRef<HTMLDivElement>(null)
  useScrollIntoView(contentRef, { enabled: keyboard.isVisible, offset: 20 })
  const { currentTrip } = useCurrentTrip()
  const { participants, getAdultParticipants } = useParticipantContext()
  const { createExpense, updateExpense, getExpenseById } = useExpenseContext()
  const { completeReceiptTask, error: receiptError, clearError: clearReceiptError } = useReceiptContext()
  const { updateTrip } = useTripContext()
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (receiptError) {
      toast({ title: t('receipt.receiptError'), description: receiptError, variant: 'destructive' })
      clearReceiptError()
    }
  }, [receiptError])

  const adultParticipants = getAdultParticipants()
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])
  const baseCurrency = currentTrip?.default_currency ?? 'EUR'
  const knownCurrencies = useMemo(
    () => [baseCurrency, ...Object.keys(currentTrip?.exchange_rates ?? {})],
    [baseCurrency, currentTrip?.exchange_rates]
  )

  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [allocations, setAllocations] = useState<Allocations>(new Map())
  const [view, setView] = useReceiptAllocationView()
  const [carryForward, setCarryForward] = useReceiptCarryForward()
  const [expandedPersonIds, setExpandedPersonIds] = useState<Set<string>>(new Set())
  const [confirmedTotal, setConfirmedTotal] = useState('')
  const [tipAmount, setTipAmount] = useState('0')
  const [paidBy, setPaidBy] = useState('')
  const validCategories: ExpenseCategory[] = ['Food', 'Accommodation', 'Transport', 'Activities', 'Training', 'Other']
  const [category, setCategory] = useState<ExpenseCategory>(
    validCategories.includes(extractedCategory as ExpenseCategory) ? extractedCategory as ExpenseCategory : 'Food'
  )
  const [merchantName, setMerchantName] = useState('')
  const [activeCurrency, setActiveCurrency] = useState(currency)
  const [exchangeRate, setExchangeRate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showAllItems, setShowAllItems] = useState(true)
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null)
  const [showThumbnail, setShowThumbnail] = useState(true)

  const currencyOptions = useMemo(() => {
    const opts = [...knownCurrencies]
    if (activeCurrency && !opts.includes(activeCurrency)) opts.push(activeCurrency)
    return opts
  }, [knownCurrencies, activeCurrency])

  const currencyIsUnknown =
    activeCurrency !== baseCurrency && !knownCurrencies.includes(activeCurrency)
  const exchangeRateFloat = parseFloat(exchangeRate)

  useEffect(() => {
    if (!open) return

    const defaultPayerId = adultParticipants.find(p => p.user_id === user?.id)?.id ?? adultParticipants[0]?.id ?? ''
    const existingExpense = existingExpenseId ? getExpenseById(existingExpenseId) : undefined

    const withIds = ensureItemIds(initialItems)
    const normalizedMapped: MappedItem[] = mappedItems ? normalizeMappedItems(mappedItems, initialItems) : []
    const initialAllocs = mappedItemsToAllocations(normalizedMapped)
    const allocatedItemIds = new Set(normalizedMapped.map(m => m.itemId))

    setEditableItems(
      withIds.map(item => ({
        id: item.id,
        name: item.name,
        nameOriginal: item.nameOriginal,
        price: item.price.toFixed(2),
        qty: item.qty,
        manuallySet: allocatedItemIds.has(item.id),
      }))
    )
    setAllocations(initialAllocs)
    setExpandedPersonIds(new Set())
    setConfirmedTotal(extractedTotal != null ? extractedTotal.toFixed(2) : '')
    setTipAmount(savedTipAmount != null && savedTipAmount > 0 ? savedTipAmount.toFixed(2) : '0')
    setPaidBy(existingExpense?.paid_by ?? defaultPayerId)
    setMerchantName(merchant ?? '')
    setCategory(
      existingExpense?.category && validCategories.includes(existingExpense.category)
        ? existingExpense.category
        : validCategories.includes(extractedCategory as ExpenseCategory) ? extractedCategory as ExpenseCategory : 'Food'
    )
    setActiveCurrency(currency)
    setExchangeRate('')
    setShowAllItems(true)
  }, [open, taskId])

  useEffect(() => {
    if (!open || !imagePath) {
      setReceiptImageUrl(null)
      setShowThumbnail(false)
      return
    }
    supabase.storage
      .from('receipts')
      .createSignedUrl(imagePath, 3600)
      .then(({ data, error }) => {
        if (error) {
          logger.warn('Failed to generate receipt image signed URL', { error: error.message })
        } else {
          setReceiptImageUrl(data.signedUrl)
        }
      })
  }, [open, imagePath])

  const applyCountChange = (itemId: string, participantId: string, delta: number) => {
    const item = editableItems.find(i => i.id === itemId)
    if (!item) return

    setAllocations(prev => {
      const next: Allocations = new Map()
      for (const [k, v] of prev) next.set(k, new Map(v))
      const inner = next.get(itemId) ?? new Map<string, number>()
      const current = inner.get(participantId) ?? 0
      const totalSoFar = Array.from(inner.values()).reduce((a, b) => a + b, 0)
      let newCount = Math.max(0, current + delta)
      const proposedTotal = totalSoFar - current + newCount
      if (proposedTotal > item.qty) newCount = current + (item.qty - totalSoFar)
      if (newCount === current) return prev
      if (newCount === 0) inner.delete(participantId)
      else inner.set(participantId, newCount)
      next.set(itemId, inner)

      if (carryForward) {
        const sourceSet = Array.from(inner.keys())
        const itemIndex = editableItems.findIndex(i => i.id === itemId)
        for (let i = itemIndex + 1; i < editableItems.length; i++) {
          const target = editableItems[i]
          if (target.manuallySet) continue
          const distributed = distributeEvenly(sourceSet, target.qty)
          next.set(target.id, distributed)
        }
      }

      return next
    })

    setEditableItems(prev =>
      prev.map(i => (i.id === itemId && !i.manuallySet ? { ...i, manuallySet: true } : i))
    )
  }

  const applyAssignEvenly = (itemId: string) => {
    const item = editableItems.find(i => i.id === itemId)
    if (!item) return
    const ids = participants.map(p => p.id)
    const distributed = distributeEvenly(ids, item.qty)

    setAllocations(prev => {
      const next: Allocations = new Map()
      for (const [k, v] of prev) next.set(k, new Map(v))
      next.set(itemId, distributed)

      if (carryForward) {
        const itemIndex = editableItems.findIndex(i => i.id === itemId)
        for (let i = itemIndex + 1; i < editableItems.length; i++) {
          const target = editableItems[i]
          if (target.manuallySet) continue
          next.set(target.id, distributeEvenly(ids, target.qty))
        }
      }
      return next
    })

    setEditableItems(prev =>
      prev.map(i => (i.id === itemId && !i.manuallySet ? { ...i, manuallySet: true } : i))
    )
  }

  const updateItemName = (id: string, name: string) => {
    setEditableItems(prev => prev.map(item => (item.id === id ? { ...item, name, manuallySet: true } : item)))
  }

  const updateItemPrice = (id: string, price: string) => {
    setEditableItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, price: price.replace(',', '.'), manuallySet: true } : item
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

  const underAssignedItems = editableItems.filter(item => {
    const inner = allocations.get(item.id)
    const total = inner ? Array.from(inner.values()).reduce((a, b) => a + b, 0) : 0
    return total < item.qty && parseFloat(item.price) > 0
  })

  const totalUnits = editableItems.reduce((sum, i) => sum + (parseFloat(i.price) > 0 ? i.qty : 0), 0)
  const assignedUnits = editableItems.reduce((sum, i) => {
    if (parseFloat(i.price) <= 0) return sum
    const inner = allocations.get(i.id)
    const t = inner ? Array.from(inner.values()).reduce((a, b) => a + b, 0) : 0
    return sum + Math.min(t, i.qty)
  }, 0)

  const canSubmit =
    paidBy &&
    totalFloat > 0 &&
    underAssignedItems.length === 0 &&
    editableItems.some(item => (allocations.get(item.id)?.size ?? 0) > 0) &&
    (!currencyIsUnknown || (exchangeRateFloat > 0))

  const handleSubmit = async () => {
    if (!currentTrip || !canSubmit) return
    setSubmitting(true)

    try {
      if (currencyIsUnknown && exchangeRateFloat > 0) {
        const updatedRates = {
          ...(currentTrip.exchange_rates ?? {}),
          [activeCurrency]: exchangeRateFloat,
        }
        await updateTrip(currentTrip.id, { exchange_rates: updatedRates })
      }

      const distributable = editableItems.map(item => ({
        id: item.id,
        price: parseFloat(item.price) || 0,
        qty: item.qty,
      }))

      const { distribution, totalAmount } = buildReceiptDistribution({
        items: distributable,
        allocations,
        confirmedTotal: totalFloat,
        tipAmount: tipFloat,
      })

      const description = merchantName.trim()
        ? `Receipt: ${merchantName.trim()}`
        : 'Receipt'

      let expenseId: string

      if (existingExpenseId) {
        await updateExpense(existingExpenseId, {
          description,
          amount: totalAmount,
          currency: activeCurrency,
          paid_by: paidBy,
          distribution,
          category,
        })
        expenseId = existingExpenseId
      } else {
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
          toast({ title: t('toast.failedToCreateExpense'), variant: 'destructive' })
          setSubmitting(false)
          return
        }
        expenseId = expense.id
      }

      const mappedItemsToSave: MappedItem[] = allocationsToMappedItems(allocations)
      await completeReceiptTask(taskId, expenseId, mappedItemsToSave, tipFloat)

      toast({
        title: existingExpenseId ? t('receipt.receiptUpdated') : t('receipt.receiptAdded'),
        description: `${description} - ${activeCurrency} ${totalAmount.toFixed(2)}`,
      })

      onOpenChange(false)
      onDone()
    } catch (err) {
      logger.error('Receipt review submit failed', { error: String(err), task_id: taskId })
      toast({ title: t('toast.errorAddingExpense'), description: String(err), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const personViewItems = useMemo(
    () => editableItems.map(i => ({
      id: i.id,
      name: i.name,
      nameOriginal: i.nameOriginal,
      price: parseFloat(i.price) || 0,
      qty: i.qty,
    })),
    [editableItems]
  )

  const togglePersonExpand = (pid: string) => {
    setExpandedPersonIds(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  const body = (
    <div className="px-4 py-3 space-y-4">
      {receiptImageUrl && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground"
            onClick={() => setShowThumbnail(v => !v)}
          >
            <span className="flex items-center gap-1.5">
              <Image size={14} />
              {t('receipt.receiptPhoto')}
            </span>
            {showThumbnail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showThumbnail && (
            <img
              src={receiptImageUrl}
              alt="Receipt"
              className="w-full max-h-64 object-contain bg-muted"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="merchant" className="text-xs">{t('receipt.merchant')}</Label>
          <Input
            id="merchant"
            value={merchantName}
            onChange={e => setMerchantName(e.target.value)}
            placeholder={t('receipt.merchantPlaceholder')}
            className="h-9 text-sm"
            style={{ fontSize: '1rem' }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category" className="text-xs">{t('common.category')}</Label>
          <Select value={category} onValueChange={val => setCategory(val as ExpenseCategory)}>
            <SelectTrigger id="category" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Food">{t('expenses.categoryFood')}</SelectItem>
              <SelectItem value="Accommodation">{t('expenses.categoryAccommodation')}</SelectItem>
              <SelectItem value="Transport">{t('expenses.categoryTransport')}</SelectItem>
              <SelectItem value="Activities">{t('expenses.categoryActivities')}</SelectItem>
              <SelectItem value="Training">{t('expenses.categoryTraining')}</SelectItem>
              <SelectItem value="Other">{t('expenses.categoryOther')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="paidby" className="text-xs">{t('expenses.paidBy')}</Label>
        <Select value={paidBy} onValueChange={setPaidBy}>
          <SelectTrigger id="paidby" className="h-9 text-sm">
            <SelectValue placeholder={t('expenses.chooseWhoPaid')} />
          </SelectTrigger>
          <SelectContent>
            {adultParticipants.map(p => (
              <SelectItem key={p.id} value={p.id}>{shortNames.get(p.id) || p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <button
          className="flex items-center justify-between w-full text-sm font-medium text-foreground"
          onClick={() => setShowAllItems(v => !v)}
        >
          <span>{t('receipt.items', { count: editableItems.length })}</span>
          {showAllItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showAllItems && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex rounded-full border border-border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setView('by-item')}
                  className={`px-3 py-1 rounded-full ${view === 'by-item' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
                >
                  By Item
                </button>
                <button
                  type="button"
                  onClick={() => setView('by-person')}
                  className={`px-3 py-1 rounded-full ${view === 'by-person' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
                >
                  By Person
                </button>
              </div>
              {view === 'by-item' ? (
                <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={carryForward}
                    onChange={e => setCarryForward(e.target.checked)}
                    className="rounded"
                  />
                  Carry forward
                </label>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {assignedUnits} of {totalUnits} assigned
                </span>
              )}
            </div>

            {view === 'by-item' ? (
              <div className="space-y-3">
                {editableItems.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    index={i}
                    item={item}
                    counts={allocations.get(item.id) ?? new Map()}
                    participants={participants}
                    shortNames={shortNames}
                    onNameChange={name => updateItemName(item.id, name)}
                    onPriceChange={price => updateItemPrice(item.id, price)}
                    onCountChange={(pid, delta) => applyCountChange(item.id, pid, delta)}
                    onAssignEvenly={() => applyAssignEvenly(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map(p => {
                  const myCounts = new Map<string, number>()
                  for (const [iid, inner] of allocations) {
                    const c = inner.get(p.id)
                    if (c && c > 0) myCounts.set(iid, c)
                  }
                  return (
                    <PersonRow
                      key={p.id}
                      participant={p}
                      items={personViewItems}
                      myCounts={myCounts}
                      allCounts={allocations}
                      currency={activeCurrency}
                      expanded={expandedPersonIds.has(p.id)}
                      onToggleExpand={() => togglePersonExpand(p.id)}
                      onCountChange={(itemId, delta) => applyCountChange(itemId, p.id, delta)}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {underAssignedItems.length > 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{underAssignedItems.length} item(s) still have unassigned units</span>
        </div>
      )}

      <div className="border border-border rounded-lg p-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="receipt-currency" className="text-xs">{t('receipt.currency')}</Label>
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

        {currencyIsUnknown && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{t('receipt.exchangeRateWarning', { currency: activeCurrency })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">1 {baseCurrency} =</span>
              <Input
                inputMode="decimal"
                value={exchangeRate}
                onChange={e => setExchangeRate(e.target.value.replace(',', '.'))}
                placeholder="0.00"
                className="h-9 text-sm"
                style={{ fontSize: '1rem' }}
              />
              <span className="text-sm font-medium">{activeCurrency}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('receipt.exchangeRateSavedHint')}</p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('receipt.itemsTotal')}</span>
          <span>{activeCurrency} {itemsTotal.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="confirmed-total" className="text-xs">{t('receipt.totalCharged', { currency: activeCurrency })}</Label>
            <Input
              id="confirmed-total"
              inputMode="decimal"
              value={confirmedTotal}
              onChange={e => setConfirmedTotal(e.target.value.replace(',', '.'))}
              placeholder="0.00"
              className="h-9 text-sm"
              style={{ fontSize: '1rem' }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tip" className="text-xs">{t('receipt.tip', { currency: activeCurrency })}</Label>
            <Input
              id="tip"
              inputMode="decimal"
              value={tipAmount}
              onChange={e => setTipAmount(e.target.value.replace(',', '.'))}
              placeholder="0.00"
              className="h-9 text-sm"
              style={{ fontSize: '1rem' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between font-semibold text-sm border-t border-border pt-2">
          <span>{t('receipt.totalExpense')}</span>
          <span>{activeCurrency} {totalExpense.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )

  const footerContent = (
    <>
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full gap-2"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {existingExpenseId ? t('receipt.updatingExpense') : t('receipt.addingExpense')}
          </>
        ) : (
          t('receipt.addExpenseButton', { action: existingExpenseId ? t('common.update') : t('common.add'), currency: activeCurrency, amount: totalExpense.toFixed(2) })
        )}
      </Button>
      {!canSubmit && totalFloat > 0 && underAssignedItems.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t('receipt.assignAllToSubmit')}
        </p>
      )}
    </>
  )

  return (
    <ResponsiveOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('receipt.reviewReceipt')}
      hasInputs
      maxWidth="max-w-2xl"
      footer={footerContent}
      scrollRef={contentRef}
      scrollClassName=""
    >
      {body}
    </ResponsiveOverlay>
  )
}
