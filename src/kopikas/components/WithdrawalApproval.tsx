// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { useBudget } from '../contexts/BudgetContext'
import type { WalletSavingsEntry } from '../types'

interface WithdrawalApprovalProps {
  withdrawal: WalletSavingsEntry
  walletName: string
}

export function WithdrawalApproval({ withdrawal, walletName }: WithdrawalApprovalProps) {
  const { approveWithdrawal, denyWithdrawal } = useBudget()
  const [acting, setActing] = useState(false)

  const handleApprove = async () => {
    setActing(true)
    try {
      await approveWithdrawal(withdrawal.id)
    } finally {
      setActing(false)
    }
  }

  const handleDeny = async () => {
    setActing(true)
    try {
      await denyWithdrawal(withdrawal.id)
    } finally {
      setActing(false)
    }
  }

  const displayAmount = Math.abs(withdrawal.amount).toFixed(2)

  return (
    <div className="border border-amber-500/30 bg-amber-500/10 rounded-xl p-4">
      <p className="text-sm mb-3">
        {walletName} soovib võtta €{displayAmount}
        {withdrawal.description ? ` — ${withdrawal.description}` : ''}
      </p>
      <div className="flex gap-2">
        <button onClick={handleApprove} disabled={acting}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 transition-opacity">
          Kinnita
        </button>
        <button onClick={handleDeny} disabled={acting}
          className="flex-1 py-2 rounded-xl border border-border text-foreground font-medium text-sm disabled:opacity-50 hover:bg-muted/50 transition-colors">
          Keeldu
        </button>
      </div>
    </div>
  )
}
