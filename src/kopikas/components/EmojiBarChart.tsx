// SPDX-License-Identifier: Apache-2.0
import type { WalletTransaction, KopikasCategory } from '../types'
import { getCategoryEmoji } from '../lib/kopikasCategories'
import { useState } from 'react'
import { TransactionList } from './TransactionList'

interface EmojiBarChartProps {
  transactions: WalletTransaction[]
}

const BAR_COLORS: Record<KopikasCategory, string> = {
  sweets: 'bg-pink-400',
  food: 'bg-orange-400',
  clothes: 'bg-blue-400',
  beauty: 'bg-rose-400',
  fun: 'bg-green-400',
  school: 'bg-yellow-400',
  gifts: 'bg-purple-400',
  charity: 'bg-red-400',
  other: 'bg-gray-400',
}

interface CategoryTotal {
  category: KopikasCategory
  total: number
  transactions: WalletTransaction[]
}

export function EmojiBarChart({ transactions }: EmojiBarChartProps) {
  const [expanded, setExpanded] = useState<KopikasCategory | null>(null)

  const expenses = transactions.filter(t => t.type === 'expense' && t.category)

  // Group by category and sum
  const categoryMap = new Map<KopikasCategory, CategoryTotal>()
  for (const tx of expenses) {
    const cat = tx.category as KopikasCategory
    const existing = categoryMap.get(cat)
    if (existing) {
      existing.total += tx.amount
      existing.transactions.push(tx)
    } else {
      categoryMap.set(cat, { category: cat, total: tx.amount, transactions: [tx] })
    }
  }

  const sorted = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)
  const maxTotal = sorted.length > 0 ? sorted[0].total : 0

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Kulutusi pole veel
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map(({ category, total, transactions: catTxns }) => (
        <div key={category}>
          <button
            onClick={() => setExpanded(expanded === category ? null : category)}
            className="w-full flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-1 transition-colors"
          >
            <span className="text-xl shrink-0 w-8 text-center">{getCategoryEmoji(category)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`h-5 rounded-full ${BAR_COLORS[category]} transition-all duration-500`}
                  style={{ width: `${Math.max((total / maxTotal) * 100, 8)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium tabular-nums shrink-0">€{total.toFixed(2)}</span>
          </button>

          {/* Expanded transactions */}
          {expanded === category && (
            <div className="ml-11 mb-2 border-l-2 border-border pl-3">
              <TransactionList transactions={catTxns} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
