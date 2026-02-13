import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ParticipantBalance } from '@/services/balanceCalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CostPerParticipantChartProps {
  balances: ParticipantBalance[]
  currency?: string
}

export function CostPerParticipantChart({ balances, currency = 'EUR' }: CostPerParticipantChartProps) {
  const chartData = useMemo(() => {
    return balances
      .map(balance => ({
        name: balance.name.length > 15 ? balance.name.substring(0, 15) + '...' : balance.name,
        fullName: balance.name,
        totalShare: Math.round(balance.totalShare * 100) / 100,
      }))
      .sort((a, b) => b.totalShare - a.totalShare) // Sort by total share descending
  }, [balances])

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost per Participant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data to display
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
          <p className="font-semibold text-foreground">{data.fullName}</p>
          <p className="text-sm text-muted-foreground">
            Total Share: {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency,
            }).format(data.totalShare)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost per Participant</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickFormatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="totalShare" radius={[8, 8, 0, 0]}>
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill="hsl(var(--accent))" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
