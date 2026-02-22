import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import type { Expense } from '@/types/expense'
import type { Participant } from '@/types/participant'
import { convertToBaseCurrency } from '@/services/balanceCalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TopExpensesListProps {
  expenses: Expense[]
  participants: Participant[]
  limit?: number
  currency?: string
  exchangeRates?: Record<string, number>
}

export function TopExpensesList({ expenses, participants, limit = 5, currency = 'EUR', exchangeRates = {} }: TopExpensesListProps) {
  const topExpenses = useMemo(() => {
    return expenses
      .slice()
      .sort((a, b) => convertToBaseCurrency(b.amount, b.currency, currency, exchangeRates) - convertToBaseCurrency(a.amount, a.currency, currency, exchangeRates))
      .slice(0, limit)
      .map(expense => {
        const payer = participants.find(p => p.id === expense.paid_by)
        return {
          ...expense,
          payerName: payer?.name || 'Unknown',
        }
      })
  }, [expenses, participants, limit])

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Top {limit} Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No expenses to display
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={20} />
          Top {Math.min(limit, expenses.length)} Expenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topExpenses.map((expense, index) => (
            <div
              key={expense.id}
              className={`flex items-start justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">#{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {expense.description}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span>Paid by {expense.payerName} • {new Date(expense.expense_date).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {expense.category}
                    </Badge>
                  </p>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0">
                <div className="text-right">
                  <span className="font-bold text-foreground tabular-nums text-lg">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: expense.currency || currency,
                    }).format(expense.amount)}
                  </span>
                  {expense.currency && expense.currency !== currency && exchangeRates[expense.currency] && (
                    <div className="text-xs text-muted-foreground tabular-nums">
                      ({new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency,
                      }).format(convertToBaseCurrency(expense.amount, expense.currency, currency, exchangeRates))})
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
