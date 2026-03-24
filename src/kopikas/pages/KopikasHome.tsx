// SPDX-License-Identifier: Apache-2.0
import { useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { usePet } from '../hooks/usePet'
import { useBudget } from '../contexts/BudgetContext'
import { Pet } from '../components/Pet'
import { PetSpeechBubble } from '../components/PetSpeechBubble'
import { TransactionList } from '../components/TransactionList'
import { PurchaseWizard } from '../components/PurchaseWizard'
import { ScanFlow } from '../components/ScanFlow'
import { SavingsSheet } from '../components/SavingsSheet'
import { useKopikasBasePath } from '../hooks/useKopikasBasePath'
import { Loader2, ScanLine, PencilLine, BarChart3 } from 'lucide-react'
import type { KopikasCategory } from '../types'

type ScanData = {
  amount: number
  vendor: string
  items: Array<{ description: string; amount: number; category: KopikasCategory }>
  receiptImagePath?: string
  receiptBatchId?: string
}

export function KopikasHome() {
  const { walletCode } = useParams<{ walletCode: string }>()
  const { wallet, transactions, balance, lastAllowance, loading: walletLoading } = useWallet()
  const { pet, mood, loading: petLoading } = usePet()
  const { budget, budgetState } = useBudget()
  const navigate = useNavigate()
  const basePath = useKopikasBasePath()
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanData, setScanData] = useState<ScanData | undefined>()
  const [savingsOpen, setSavingsOpen] = useState(false)

  const handleScanComplete = useCallback((data: ScanData) => {
    setScanData(data)
    setPurchaseOpen(true)
  }, [])

  const handlePurchaseClose = useCallback(() => {
    setPurchaseOpen(false)
    setScanData(undefined)
  }, [])

  if (walletLoading || petLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!wallet || !pet) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Rahakotti ei leitud</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Pet section */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <PetSpeechBubble mood={mood} />
        <Pet mood={mood.tier} level={pet.level} size="lg" />
        <p className="text-sm text-muted-foreground">
          {pet.name} · Tase {pet.level}
        </p>
      </div>

      {/* Balance / Budget display */}
      {budget !== null && budgetState ? (
        <div className="text-center mb-8">
          <p className={`text-4xl font-bold tabular-nums ${
            budgetState.weeklyRemaining / budgetState.effectiveBudget > 0.5
              ? 'text-green-500'
              : budgetState.weeklyRemaining / budgetState.effectiveBudget >= 0.3
                ? 'text-primary'
                : 'text-red-500'
          }`}>
            €{budgetState.weeklyRemaining.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Sel nädalal alles</p>

          {/* Progress bar */}
          <div className="mx-auto mt-3 max-w-[200px]">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetState.weekSpending / budgetState.effectiveBudget > 0.7
                    ? 'bg-red-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, (budgetState.weekSpending / budgetState.effectiveBudget) * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            €{budgetState.weekSpending.toFixed(2)} kulutatud / €{budgetState.effectiveBudget.toFixed(2)}
          </p>

          {/* Debt indicator */}
          {budgetState.debt > 0 && (
            <p className="text-xs text-red-500 mt-1">
              Eelmise nädala võlg: -€{budgetState.debt.toFixed(2)}
            </p>
          )}

          {/* Savings chip + total balance */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setSavingsOpen(true)}
              className="bg-muted rounded-2xl px-4 py-2 inline-flex items-center gap-2"
            >
              <span>🐷</span>
              <div className="text-left">
                <div className="font-semibold text-sm">€{budgetState.totalSavings.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">Hoiupõrsas</div>
              </div>
              <span className="text-muted-foreground text-sm">›</span>
            </button>
            <div className="bg-muted rounded-2xl px-4 py-2 inline-flex items-center gap-2">
              <span>💰</span>
              <div className="text-left">
                <div className="font-semibold text-sm">€{balance.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">Kontol kokku</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center mb-8">
          <p className="text-4xl font-bold tabular-nums">
            €{balance.toFixed(2)}
          </p>
          {lastAllowance && (
            <p className="text-sm text-muted-foreground mt-1">
              €{lastAllowance.amount.toFixed(2)}-st alles
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <button
          onClick={() => setScanOpen(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ScanLine size={20} className="text-primary" />
          </div>
          <span className="text-xs font-medium">Skanni</span>
        </button>
        <button
          onClick={() => setPurchaseOpen(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <PencilLine size={20} className="text-primary" />
          </div>
          <span className="text-xs font-medium">Lisa</span>
        </button>
        <button
          onClick={() => navigate(`${basePath}/${walletCode}/analytics`)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BarChart3 size={20} className="text-primary" />
          </div>
          <span className="text-xs font-medium">Ülevaade</span>
        </button>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Viimased</h2>
          <Link
            to={`${basePath}/${walletCode}/history`}
            className="text-sm text-primary hover:underline"
          >
            Vaata kõiki
          </Link>
        </div>
        <TransactionList transactions={transactions} limit={10} />
      </div>

      <PurchaseWizard open={purchaseOpen} onClose={handlePurchaseClose} initialData={scanData} />
      <ScanFlow open={scanOpen} onClose={() => setScanOpen(false)} onScanComplete={handleScanComplete} />
      <SavingsSheet open={savingsOpen} onClose={() => setSavingsOpen(false)} />
    </div>
  )
}
