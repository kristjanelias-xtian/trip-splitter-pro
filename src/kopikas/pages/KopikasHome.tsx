// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { usePet } from '../hooks/usePet'
import { Pet } from '../components/Pet'
import { PetSpeechBubble } from '../components/PetSpeechBubble'
import { TransactionList } from '../components/TransactionList'
import { ManualAddSheet } from '../components/ManualAddSheet'
import { ScanFlow } from '../components/ScanFlow'
import { useKopikasBasePath } from '../hooks/useKopikasBasePath'
import { Loader2, ScanLine, PencilLine, BarChart3 } from 'lucide-react'

export function KopikasHome() {
  const { walletCode } = useParams<{ walletCode: string }>()
  const { wallet, transactions, balance, lastAllowance, loading: walletLoading } = useWallet()
  const { pet, mood, loading: petLoading } = usePet()
  const navigate = useNavigate()
  const basePath = useKopikasBasePath()
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

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

      {/* Balance */}
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
          onClick={() => setManualAddOpen(true)}
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

      <ManualAddSheet open={manualAddOpen} onClose={() => setManualAddOpen(false)} />
      <ScanFlow open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  )
}
