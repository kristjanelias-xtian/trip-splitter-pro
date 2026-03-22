// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useBudget } from '../contexts/BudgetContext'
import { X } from 'lucide-react'

interface BudgetConfigProps {
  open: boolean
  onClose: () => void
}

export function BudgetConfig({ open, onClose }: BudgetConfigProps) {
  const { budget, setBudget } = useBudget()
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pre-fill with current budget amount when opening
  useEffect(() => {
    if (open && budget) {
      setAmount(budget.weekly_amount.toString())
    } else if (open && !budget) {
      setAmount('')
    }
  }, [open, budget])

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    setSubmitting(true)
    try {
      await setBudget(numAmount)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '75dvh' }}>
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <SheetTitle>Eelarve</SheetTitle>
          <button onClick={onClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Nädala eelarve</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <input type="text" inputMode="decimal" value={amount}
                onChange={e => setAmount(e.target.value.replace(',', '.'))}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {budget
              ? `Eelarve algab: ${budget.start_date}`
              : 'Eelarve algab järgmisel esmaspäeval'}
          </p>
        </div>

        <div className="shrink-0 p-4 border-t border-border">
          <button onClick={handleSubmit} disabled={submitting || !amount}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity">
            {submitting ? 'Salvestan...' : 'Salvesta'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
