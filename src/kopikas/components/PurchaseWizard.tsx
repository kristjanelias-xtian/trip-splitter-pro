// SPDX-License-Identifier: Apache-2.0
import { useState, useRef, useCallback, useEffect } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWallet } from '../hooks/useWallet'
import { usePet } from '../hooks/usePet'
import { CategoryPicker } from './CategoryPicker'
import { DatePicker } from './DatePicker'
import { inferKopikasCategory } from '../lib/categoryInference'
import { getCategoryEmoji } from '../lib/kopikasCategories'
import { getXpForAction } from '../lib/xpCalculator'
import type { KopikasCategory } from '../types'
import { ArrowLeft, X, Plus } from 'lucide-react'

interface PurchaseWizardProps {
  open: boolean
  onClose: () => void
  initialData?: {
    amount: number
    vendor: string
    items: Array<{ description: string; amount: number; category: KopikasCategory }>
    receiptImagePath?: string
    receiptBatchId?: string
  }
}

interface ItemRow {
  id: string
  description: string
  amount: string
  category: KopikasCategory | null
  categoryManuallySet: boolean
  showCategoryPicker: boolean
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function makeItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function PurchaseWizard({ open, onClose, initialData }: PurchaseWizardProps) {
  const { wallet, addTransaction } = useWallet()
  const { awardXp } = usePet()

  // Step 1 state
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayISO())

  // Step 2 state
  const [items, setItems] = useState<ItemRow[]>([])

  // Submission
  const [submitting, setSubmitting] = useState(false)

  // Debounce refs per item
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Pre-fill from initialData when opening
  useEffect(() => {
    if (open && initialData) {
      setAmount(initialData.amount.toString())
      setVendor(initialData.vendor || '')
      if (initialData.items.length > 0) {
        setItems(initialData.items.map(item => ({
          id: makeItemId(),
          description: item.description,
          amount: item.amount.toString(),
          category: item.category,
          categoryManuallySet: true,
          showCategoryPicker: false,
        })))
      }
    }
  }, [open, initialData])

  // Reset 300ms after close
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        if (!isMounted.current) return
        setStep(1)
        setAmount('')
        setVendor('')
        setPurchaseDate(todayISO())
        setItems([])
        setSubmitting(false)
        debounceRefs.current.forEach(t => clearTimeout(t))
        debounceRefs.current.clear()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  const totalAmount = parseFloat(amount) || 0

  const itemsTotal = items.reduce((sum, item) => {
    const val = parseFloat(item.amount) || 0
    return sum + val
  }, 0)

  const remaining = totalAmount - itemsTotal
  const allocationMatches = Math.abs(remaining) < 0.01

  // Single item that matches total => can skip step 3
  const canSkipStep3 = items.length === 1 && allocationMatches

  const goToStep2 = useCallback(() => {
    if (items.length === 0) {
      // Auto-create first item with total amount
      setItems([{
        id: makeItemId(),
        description: '',
        amount: amount,
        category: null,
        categoryManuallySet: false,
        showCategoryPicker: false,
      }])
    }
    setStep(2)
  }, [amount, items.length])

  const handleItemDescriptionChange = useCallback((itemId: string, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return { ...item, description: value }
    }))

    // Category auto-inference with debounce
    const existing = debounceRefs.current.get(itemId)
    if (existing) clearTimeout(existing)

    debounceRefs.current.set(itemId, setTimeout(() => {
      setItems(prev => prev.map(item => {
        if (item.id !== itemId || item.categoryManuallySet) return item
        const inferred = inferKopikasCategory(value)
        if (inferred) return { ...item, category: inferred }
        return item
      }))
    }, 300))
  }, [])

  const handleItemAmountChange = useCallback((itemId: string, value: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, amount: value.replace(',', '.') } : item
    ))
  }, [])

  const handleItemCategorySelect = useCallback((itemId: string, cat: KopikasCategory) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, category: cat, categoryManuallySet: true, showCategoryPicker: false }
        : item
    ))
  }, [])

  const toggleCategoryPicker = useCallback((itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, showCategoryPicker: !item.showCategoryPicker }
        : { ...item, showCategoryPicker: false }
    ))
  }, [])

  const addItem = useCallback(() => {
    const currentRemaining = totalAmount - items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    setItems(prev => [...prev, {
      id: makeItemId(),
      description: '',
      amount: currentRemaining > 0 ? currentRemaining.toFixed(2) : '',
      category: null,
      categoryManuallySet: false,
      showCategoryPicker: false,
    }])
  }, [totalAmount, items])

  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
    const timer = debounceRefs.current.get(itemId)
    if (timer) {
      clearTimeout(timer)
      debounceRefs.current.delete(itemId)
    }
  }, [])

  const handleSubmit = async () => {
    if (!wallet || submitting) return
    setSubmitting(true)

    try {
      const purchaseGroupId = items.length > 1 ? crypto.randomUUID() : undefined

      for (const item of items) {
        const itemAmount = parseFloat(item.amount) || 0
        if (itemAmount <= 0) continue

        await addTransaction({
          wallet_id: wallet.id,
          type: 'expense',
          amount: itemAmount,
          description: item.description || undefined,
          category: item.category || undefined,
          vendor: vendor || undefined,
          purchase_date: purchaseDate,
          purchase_group_id: purchaseGroupId,
          receipt_image_path: initialData?.receiptImagePath,
          receipt_batch_id: initialData?.receiptBatchId,
        })
      }

      // Award XP once for the whole purchase
      await awardXp(getXpForAction('log_expense'))
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const stepTitle = step === 1 ? 'Ostu andmed' : step === 2 ? 'Lisa asjad' : 'Kinnita'

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '92dvh' }}>
        {/* Sticky header */}
        <div className="shrink-0 px-4 py-3 border-b border-border flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} aria-label="Tagasi">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8" />
          )}
          <SheetTitle>{stepTitle}</SheetTitle>
          <button onClick={onClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {step === 1 && (
            <div className="space-y-6">
              {/* Amount */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Summa</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">&euro;</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(',', '.'))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Vendor */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Pood</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  placeholder="Pood (valikuline)"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Kuupäev</label>
                <DatePicker selected={purchaseDate} onSelect={setPurchaseDate} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Allocation bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Jaotus</span>
                  <span className={allocationMatches ? 'text-green-600' : 'text-muted-foreground'}>
                    &euro;{itemsTotal.toFixed(2)} / &euro;{totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      allocationMatches ? 'bg-green-500' : itemsTotal > totalAmount ? 'bg-red-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, totalAmount > 0 ? (itemsTotal / totalAmount) * 100 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Item cards */}
              {items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleItemDescriptionChange(item.id, e.target.value)}
                      placeholder="Kirjeldus"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Eemalda"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCategoryPicker(item.id)}
                      className="w-10 h-10 rounded-lg border border-border flex items-center justify-center text-xl hover:bg-muted transition-colors"
                    >
                      {item.category ? getCategoryEmoji(item.category) : '?'}
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">&euro;</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.amount}
                        onChange={e => handleItemAmountChange(item.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  {item.showCategoryPicker && (
                    <CategoryPicker
                      selected={item.category}
                      onSelect={(cat) => handleItemCategorySelect(item.id, cat)}
                    />
                  )}
                </div>
              ))}

              {/* Add item button */}
              <button
                type="button"
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
                Lisa asi
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Summary header */}
              <div className="space-y-1">
                {vendor && (
                  <p className="text-sm text-muted-foreground">{vendor}</p>
                )}
                <p className="text-sm text-muted-foreground">{purchaseDate}</p>
                <p className="text-2xl font-bold">&euro;{totalAmount.toFixed(2)}</p>
              </div>

              {/* Read-only item list */}
              <div className="space-y-2">
                {items.map(item => {
                  const itemAmount = parseFloat(item.amount) || 0
                  if (itemAmount <= 0) return null
                  return (
                    <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.category ? getCategoryEmoji(item.category) : '?'}</span>
                        <span className="text-sm">{item.description || 'Nimeta'}</span>
                      </div>
                      <span className="text-sm font-medium tabular-nums">&euro;{itemAmount.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>

              {/* Total line */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-medium">Kokku</span>
                <span className="font-bold tabular-nums">&euro;{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 p-4 border-t border-border">
          {step === 1 && (
            <button
              onClick={goToStep2}
              disabled={!amount || totalAmount <= 0}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
            >
              Edasi &rarr;
            </button>
          )}
          {step === 2 && (
            <button
              onClick={canSkipStep3 ? handleSubmit : () => setStep(3)}
              disabled={!allocationMatches || submitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
            >
              {submitting
                ? 'Salvestan...'
                : canSkipStep3
                  ? 'Salvesta \u2713'
                  : 'Edasi \u2192'}
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Salvestan...' : 'Salvesta \u2713'}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
