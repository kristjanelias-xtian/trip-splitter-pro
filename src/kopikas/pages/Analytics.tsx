// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { EmojiBarChart } from '../components/EmojiBarChart'
import { getWeekStart } from '../lib/budgetCalculator'

type TimeRange = 'week' | 'month' | 'all'

const RANGE_LABELS: Record<TimeRange, string> = {
  week: 'Nädal',
  month: 'Kuu',
  all: 'Kõik',
}

function getTransactionDate(t: { purchase_date: string | null; created_at: string }): string {
  return t.purchase_date ?? t.created_at.slice(0, 10)
}

export function Analytics() {
  const { transactions } = useWallet()
  const [range, setRange] = useState<TimeRange>('week')

  const filtered = useMemo(() => {
    if (range === 'all') return transactions

    if (range === 'week') {
      // Mon–Sun of current week (matches budget week)
      const monday = getWeekStart(new Date())
      const mondayKey = monday.toISOString().slice(0, 10)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      const sundayKey = sunday.toISOString().slice(0, 10)
      return transactions.filter(t => {
        const d = getTransactionDate(t)
        return d >= mondayKey && d <= sundayKey
      })
    }

    // month: rolling 30 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return transactions.filter(t => new Date(t.created_at) >= cutoff)
  }, [transactions, range])

  const totalSpending = useMemo(() => {
    return filtered
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  }, [filtered])

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Ülevaade</h1>

      {/* Time range toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
        {(Object.keys(RANGE_LABELS) as TimeRange[]).map(key => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors
              ${range === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="text-center mb-6">
        <p className="text-2xl font-bold tabular-nums">€{totalSpending.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">Kulutused kokku</p>
      </div>

      {/* Chart */}
      <EmojiBarChart transactions={filtered} />
    </div>
  )
}
