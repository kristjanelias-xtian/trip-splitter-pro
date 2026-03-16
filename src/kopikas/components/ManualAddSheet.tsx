// SPDX-License-Identifier: Apache-2.0
import { useState, useRef, useCallback } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWallet } from '../hooks/useWallet'
import { usePet } from '../hooks/usePet'
import { CategoryPicker } from './CategoryPicker'
import { inferKopikasCategory } from '../lib/categoryInference'
import { getXpForAction } from '../lib/xpCalculator'
import type { KopikasCategory } from '../types'
import { X } from 'lucide-react'

interface ManualAddSheetProps {
  open: boolean
  onClose: () => void
}

export function ManualAddSheet({ open, onClose }: ManualAddSheetProps) {
  const { wallet, addTransaction } = useWallet()
  const { awardXp } = usePet()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<KopikasCategory | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const categoryManuallySet = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value)
    if (categoryManuallySet.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const inferred = inferKopikasCategory(value)
      if (inferred) setCategory(inferred)
    }, 300)
  }, [])

  const handleCategorySelect = useCallback((cat: KopikasCategory) => {
    setCategory(cat)
    categoryManuallySet.current = true
  }, [])

  const handleSubmit = async () => {
    if (!wallet || !amount || !category) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    setSubmitting(true)
    try {
      const result = await addTransaction({
        wallet_id: wallet.id,
        type: 'expense',
        amount: numAmount,
        description: description || undefined,
        category,
      })
      if (result) {
        await awardXp(getXpForAction('log_expense'))
        resetForm()
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setCategory(null)
    categoryManuallySet.current = false
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setTimeout(resetForm, 300) // Reset after close animation
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '92dvh' }}>
        {/* Sticky header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <SheetTitle>Lisa kulu</SheetTitle>
          <button onClick={onClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          {/* Amount */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Summa</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
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

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kirjeldus</label>
            <input
              type="text"
              value={description}
              onChange={e => handleDescriptionChange(e.target.value)}
              placeholder="Nt. jäätis, vihik..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kategooria</label>
            <CategoryPicker selected={category} onSelect={handleCategorySelect} />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 p-4 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={submitting || !amount || !category}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Salvestan...' : 'Lisa kulu'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
