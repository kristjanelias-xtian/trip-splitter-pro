// SPDX-License-Identifier: Apache-2.0
import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Expense } from '@/types/expense'
import { convertToBaseCurrency } from '@/services/balanceCalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExpenseByCategoryChartProps {
  expenses: Expense[]
  currency?: string
  exchangeRates?: Record<string, number>
}

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: 'hsl(14, 77%, 62%)', // Coral (primary)
  food: 'hsl(95, 34%, 46%)',          // Sage (secondary)
  activities: 'hsl(25, 92%, 67%)',    // Gold (accent)
  training: 'hsl(200, 70%, 50%)',     // Blue
  transport: 'hsl(280, 60%, 60%)',    // Purple
  groceries: 'hsl(160, 50%, 45%)',    // Teal
  drinks: 'hsl(330, 60%, 55%)',       // Pink
  other: 'hsl(0, 0%, 60%)',           // Gray
}

const FALLBACK_COLORS = [
  'hsl(45, 80%, 55%)',  // Amber
  'hsl(190, 70%, 45%)', // Cyan
  'hsl(260, 55%, 55%)', // Indigo
  'hsl(350, 65%, 55%)', // Rose
]

function getCategoryColor(name: string, index: number): string {
  return CATEGORY_COLORS[name.toLowerCase()] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

export function ExpenseByCategoryChart({ expenses, currency = 'EUR', exchangeRates = {} }: ExpenseByCategoryChartProps) {
  const chartData = useMemo(() => {
    // Group expenses by category and sum converted amounts
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += convertToBaseCurrency(expense.amount, expense.currency, currency, exchangeRates)
      return acc
    }, {} as Record<string, number>)

    // Convert to array format for Recharts
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100, // Round to 2 decimals
        percentage: 0, // Will be calculated after we have total
      }))
      .sort((a, b) => b.value - a.value) // Sort by value descending
  }, [expenses])

  // Calculate percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  const dataWithPercentages = chartData.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }))

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No expenses to display
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
            }).format(data.value)}
          </p>
          <p className="text-xs text-accent font-semibold">{data.percentage}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={dataWithPercentages}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {dataWithPercentages.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={getCategoryColor(entry.name, index)}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
          {dataWithPercentages.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getCategoryColor(entry.name, index) }}
              />
              <span>{entry.name}</span>
              <span className="font-medium text-foreground tabular-nums">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                  notation: 'compact',
                  maximumFractionDigits: 1,
                }).format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
