import { useMemo } from 'react'
import { ExpenseDistribution } from '@/types/expense'
import { Participant } from '@/types/participant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'

interface ExpenseSplitPreviewProps {
  amount: number
  currency: string
  distribution: ExpenseDistribution
  participants: Participant[]
}

interface SplitEntry {
  id: string
  name: string
  amount: number
}

export function ExpenseSplitPreview({
  amount,
  currency,
  distribution,
  participants,
}: ExpenseSplitPreviewProps) {
  const splitEntries = useMemo(() => {
    const entries: SplitEntry[] = []
    if (distribution.type !== 'individuals') return entries

    const splitMode = distribution.splitMode || 'equal'

    if (splitMode === 'equal') {
      const shareCount = distribution.participants.length
      const shareAmount = amount / shareCount

      distribution.participants.forEach(participantId => {
        const participant = participants.find(p => p.id === participantId)
        if (participant) {
          entries.push({
            id: participantId,
            name: participant.name,
            amount: shareAmount,
          })
        }
      })
    } else if (splitMode === 'percentage' && distribution.participantSplits) {
      distribution.participantSplits.forEach(split => {
        const participant = participants.find(p => p.id === split.participantId)
        if (participant) {
          const shareAmount = (amount * split.value) / 100
          entries.push({
            id: split.participantId,
            name: participant.name,
            amount: shareAmount,
          })
        }
      })
    } else if (splitMode === 'amount' && distribution.participantSplits) {
      distribution.participantSplits.forEach(split => {
        const participant = participants.find(p => p.id === split.participantId)
        if (participant) {
          entries.push({
            id: split.participantId,
            name: participant.name,
            amount: split.value,
          })
        }
      })
    }

    return entries
  }, [amount, distribution, participants])

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value)
  }

  const totalCalculated = splitEntries.reduce((sum, entry) => sum + entry.amount, 0)
  const hasRoundingDifference = Math.abs(totalCalculated - amount) > 0.01

  if (splitEntries.length === 0) {
    return null
  }

  return (
    <Card className="bg-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Split Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {splitEntries.map(entry => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/50"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User size={16} className="text-muted-foreground flex-shrink-0" />
              <p className="font-medium text-sm truncate">{entry.name}</p>
            </div>
            <div className="text-sm font-semibold tabular-nums ml-3">
              {formatAmount(entry.amount)}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-medium">Total</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums">
              {formatAmount(totalCalculated)}
            </span>
            {hasRoundingDifference && (
              <Badge variant="outline" className="text-xs text-amber-600">
                Rounding
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
