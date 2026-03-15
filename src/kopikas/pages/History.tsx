// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { TransactionList } from '../components/TransactionList'
import { KOPIKAS_CATEGORIES } from '../lib/kopikasCategories'
import type { KopikasCategory } from '../types'

export function History() {
  const { transactions } = useWallet()
  const [filter, setFilter] = useState<KopikasCategory | null>(null)

  const filtered = filter
    ? transactions.filter(t => t.category === filter)
    : transactions

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Ajalugu</h1>

      {/* Category filter bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setFilter(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors
            ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Kõik
        </button>
        {KOPIKAS_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilter(filter === cat.key ? null : cat.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors
              ${filter === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {cat.emoji}
          </button>
        ))}
      </div>

      <TransactionList transactions={filtered} />
    </div>
  )
}
