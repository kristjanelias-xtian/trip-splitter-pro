import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import type { Expense } from '@/types/expense'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExpenseByCategoryChartProps {
  expenses: Expense[]
  currency?: string
}

const CATEGORY_COLORS = {
  Accommodation: 'hsl(14, 77%, 62%)', // Coral (primary)
  Food: 'hsl(95, 34%, 46%)', // Sage (secondary)
  Activities: 'hsl(25, 92%, 67%)', // Gold (accent)
  Training: 'hsl(200, 70%, 50%)', // Blue
  Transport: 'hsl(280, 60%, 60%)', // Purple
  Other: 'hsl(0, 0%, 60%)', // Gray
}

export function ExpenseByCategoryChart({ expenses, currency = 'EUR' }: ExpenseByCategoryChartProps) {
  const chartData = useMemo(() => {
    // Group expenses by category and sum amounts
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += expense.amount
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
        <ResponsiveContainer width="100%" height={300}>
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
              {dataWithPercentages.map((entry) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm text-foreground">
                  {value} ({new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency,
                  }).format(entry.payload.value)})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
