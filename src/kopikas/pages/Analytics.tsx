// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { EmojiBarChart } from '../components/EmojiBarChart'
import { getWeekStart } from '../lib/budgetCalculator'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type TimeRange = 'week' | 'month' | 'all'

const RANGE_LABELS: Record<TimeRange, string> = {
  week: 'Nädal',
  month: 'Kuu',
  all: 'Kõik',
}

const ESTONIAN_MONTHS = [
  'jaanuar', 'veebruar', 'märts', 'aprill', 'mai', 'juuni',
  'juuli', 'august', 'september', 'oktoober', 'november', 'detsember',
]

function getTransactionDate(t: { purchase_date: string | null; created_at: string }): string {
  return t.purchase_date ?? t.created_at.slice(0, 10)
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()}. ${ESTONIAN_MONTHS[d.getMonth()]}`
}

export function Analytics() {
  const { transactions } = useWallet()
  const [range, setRange] = useState<TimeRange>('week')
  const [offset, setOffset] = useState(0) // 0 = current, -1 = previous, etc.

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange)
    setOffset(0)
  }

  const { filtered, periodLabel } = useMemo(() => {
    if (range === 'all') {
      return { filtered: transactions, periodLabel: '' }
    }

    if (range === 'week') {
      const now = new Date()
      const currentMonday = getWeekStart(now)
      const targetMonday = new Date(currentMonday)
      targetMonday.setDate(targetMonday.getDate() + offset * 7)
      const mondayKey = targetMonday.toISOString().slice(0, 10)
      const sunday = new Date(targetMonday)
      sunday.setDate(sunday.getDate() + 6)
      const sundayKey = sunday.toISOString().slice(0, 10)

      const label = offset === 0
        ? 'See nädal'
        : `${formatDay(mondayKey)} – ${formatDay(sundayKey)}`

      return {
        filtered: transactions.filter(t => {
          const d = getTransactionDate(t)
          return d >= mondayKey && d <= sundayKey
        }),
        periodLabel: label,
      }
    }

    // month
    const now = new Date()
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const year = targetMonth.getFullYear()
    const month = targetMonth.getMonth()
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const label = offset === 0
      ? 'See kuu'
      : `${ESTONIAN_MONTHS[month]} ${year}`

    return {
      filtered: transactions.filter(t => {
        const d = getTransactionDate(t)
        return d >= monthStart && d <= monthEnd
      }),
      periodLabel: label,
    }
  }, [transactions, range, offset])

  const totalSpending = useMemo(() => {
    return filtered
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  }, [filtered])

  const isCurrentPeriod = offset === 0

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Ülevaade</h1>

      {/* Time range toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
        {(Object.keys(RANGE_LABELS) as TimeRange[]).map(key => (
          <button
            key={key}
            onClick={() => handleRangeChange(key)}
            className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors
              ${range === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            {RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      {range !== 'all' && (
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setOffset(o => o - 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Eelmine"
          >
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground">{periodLabel}</span>
          <button
            onClick={() => setOffset(o => o + 1)}
            disabled={isCurrentPeriod}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-20"
            aria-label="Järgmine"
          >
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      )}

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
