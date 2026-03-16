// SPDX-License-Identifier: Apache-2.0
import type { WalletTransaction } from '../types'
import { getCategoryEmoji } from '../lib/kopikasCategories'
import { Wallet } from 'lucide-react'

interface TransactionListProps {
  transactions: WalletTransaction[]
  limit?: number
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Täna'
  if (diffDays === 1) return 'Eile'
  if (diffDays < 7) return `${diffDays} päeva tagasi`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} nädalat tagasi`
  return `${Math.floor(diffDays / 30)} kuud tagasi`
}

function formatAmount(amount: number): string {
  return `€${amount.toFixed(2)}`
}

export function TransactionList({ transactions, limit }: TransactionListProps) {
  const items = limit ? transactions.slice(0, limit) : transactions

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Tehinguid pole veel
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {items.map(tx => (
        <li key={tx.id} className="flex items-center gap-3 py-3 px-1">
          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center">
            {tx.type === 'allowance'
              ? <Wallet size={18} className="text-green-500" />
              : <span className="text-lg">{getCategoryEmoji(tx.category!)}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {tx.description || (tx.type === 'allowance' ? 'Taskuraha' : 'Kulu')}
            </p>
            <p className="text-xs text-muted-foreground">{relativeDate(tx.created_at)}</p>
          </div>
          <span className={`text-sm font-medium tabular-nums ${
            tx.type === 'allowance' ? 'text-green-500' : 'text-foreground'
          }`}>
            {tx.type === 'allowance' ? '+' : '-'}{formatAmount(tx.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}
