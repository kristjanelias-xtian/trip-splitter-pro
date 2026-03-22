// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { X } from 'lucide-react'
import { useBudget } from '../contexts/BudgetContext'
import { SavingsGoalForm } from './SavingsGoalForm'
import type { WalletSavingsEntry } from '../types'

interface SavingsSheetProps {
  open: boolean
  onClose: () => void
}

function formatWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDate()
  const month = d.getUTCMonth() + 1
  return `${day}.${month < 10 ? '0' : ''}${month}`
}

export function SavingsSheet({ open, onClose }: SavingsSheetProps) {
  const {
    budgetState,
    savings,
    goals,
    pendingWithdrawal,
    createGoal,
    deleteGoal,
    createWithdrawalRequest,
  } = useBudget()

  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawReason, setWithdrawReason] = useState('')

  const totalSavings = budgetState?.totalSavings ?? 0

  // Estimate weeks remaining for goals based on avg weekly auto_save (last 4)
  const avgWeeklySave = useMemo(() => {
    const autoSaves = savings
      .filter((e) => e.type === 'auto_save' && e.status === 'completed')
      .slice(0, 4) // already sorted desc by created_at
    if (autoSaves.length === 0) return 0
    const sum = autoSaves.reduce((acc, e) => acc + e.amount, 0)
    return sum / autoSaves.length
  }, [savings])

  const activeGoals = goals.filter((g) => g.completed_at === null)

  // History entries (completed savings entries)
  const historyEntries = savings.filter(
    (e) => e.status === 'completed' || e.status === 'denied'
  )

  const handleGoalSubmit = async (name: string, emoji: string, targetAmount: number) => {
    await createGoal(name, emoji, targetAmount)
    setShowGoalForm(false)
  }

  const handleWithdrawSubmit = async () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0 || amount > totalSavings) return
    await createWithdrawalRequest(amount, withdrawReason.trim())
    setWithdrawAmount('')
    setWithdrawReason('')
    setShowWithdrawForm(false)
  }

  const renderHistoryEntry = (entry: WalletSavingsEntry) => {
    if (entry.type === 'auto_save') {
      return (
        <div key={entry.id} className="flex items-center justify-between py-2">
          <span className="text-sm text-green-500">
            Nädal {entry.week_start ? formatWeekStart(entry.week_start) : '?'}: Säästsid €{entry.amount.toFixed(2)}!
          </span>
        </div>
      )
    }
    if (entry.type === 'overspend') {
      return (
        <div key={entry.id} className="flex items-center justify-between py-2">
          <span className="text-sm text-red-500">
            Ülekulutasid -€{Math.abs(entry.amount).toFixed(2)}
          </span>
        </div>
      )
    }
    if (entry.type === 'withdrawal' && entry.status === 'completed') {
      return (
        <div key={entry.id} className="flex items-center justify-between py-2">
          <span className="text-sm">
            Võtsid välja €{Math.abs(entry.amount).toFixed(2)}
          </span>
        </div>
      )
    }
    return null
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '92dvh' }}
      >
        {/* Sticky header */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-8" /> {/* spacer */}
            <SheetTitle className="text-base font-semibold">
              🐷 Hoiupõrsas
            </SheetTitle>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6">
          {/* Total savings header */}
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums">€{totalSavings.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">Kokku säästetud</p>
          </div>

          {/* Goals section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Eesmärgid</h3>
              {!showGoalForm && (
                <button
                  onClick={() => setShowGoalForm(true)}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  + Lisa
                </button>
              )}
            </div>

            {showGoalForm ? (
              <SavingsGoalForm
                onSubmit={handleGoalSubmit}
                onCancel={() => setShowGoalForm(false)}
              />
            ) : activeGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Eesmärke pole veel lisatud.</p>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const progress = Math.min(1, totalSavings / goal.target_amount)
                  const remaining = goal.target_amount - totalSavings
                  const weeksLeft = avgWeeklySave > 0 && remaining > 0
                    ? Math.ceil(remaining / avgWeeklySave)
                    : null

                  return (
                    <div key={goal.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{goal.emoji}</span>
                          <span className="font-medium text-sm">{goal.name}</span>
                        </div>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          aria-label="Kustuta eesmärk"
                          className="rounded-full w-6 h-6 flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-1">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          €{Math.min(totalSavings, goal.target_amount).toFixed(2)} / €{goal.target_amount.toFixed(2)}
                        </span>
                        {weeksLeft !== null && (
                          <span className="text-xs text-muted-foreground">
                            ~{weeksLeft} nädalat veel
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Withdraw section */}
          <div>
            {pendingWithdrawal ? (
              <div className="rounded-xl border border-border p-3 text-center">
                <p className="text-sm">
                  ⏳ Ootab vanema kinnitust: €{Math.abs(pendingWithdrawal.amount).toFixed(2)}
                </p>
              </div>
            ) : showWithdrawForm ? (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Summa (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value.replace(',', '.'))}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Põhjus (valikuline)</label>
                  <input
                    type="text"
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    placeholder="Põhjus (valikuline)"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  ⏳ Vanem peab nõustuma enne kui raha vabaneb
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowWithdrawForm(false)
                      setWithdrawAmount('')
                      setWithdrawReason('')
                    }}
                    className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Tühista
                  </button>
                  <button
                    type="button"
                    onClick={handleWithdrawSubmit}
                    disabled={
                      !withdrawAmount ||
                      isNaN(parseFloat(withdrawAmount)) ||
                      parseFloat(withdrawAmount) <= 0 ||
                      parseFloat(withdrawAmount) > totalSavings
                    }
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 transition-colors"
                  >
                    Saada päring
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWithdrawForm(true)}
                className="w-full rounded-xl border border-border p-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                🔓 Võta raha välja
              </button>
            )}
          </div>

          {/* History section */}
          {historyEntries.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Ajalugu</h3>
              <div className="divide-y divide-border">
                {historyEntries.map(renderHistoryEntry)}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
