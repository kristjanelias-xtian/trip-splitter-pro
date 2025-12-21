import { useMemo } from 'react'
import { ExpenseDistribution } from '@/types/expense'
import { Participant, Family } from '@/types/participant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, User } from 'lucide-react'

interface ExpenseSplitPreviewProps {
  amount: number
  currency: string
  distribution: ExpenseDistribution
  participants: Participant[]
  families: Family[]
  accountForFamilySize?: boolean // Phase 2: will be used by toggle
}

interface SplitEntry {
  id: string
  name: string
  amount: number
  isFamily: boolean
  peopleCount?: number
  perPersonAmount?: number
}

export function ExpenseSplitPreview({
  amount,
  currency,
  distribution,
  participants,
  families,
  accountForFamilySize,
}: ExpenseSplitPreviewProps) {
  const splitEntries = useMemo(() => {
    const entries: SplitEntry[] = []
    const splitMode = distribution.splitMode || 'equal'

    if (distribution.type === 'individuals') {
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
              isFamily: false,
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
              isFamily: false,
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
              isFamily: false,
            })
          }
        })
      }
    } else if (distribution.type === 'families') {
      if (splitMode === 'equal') {
        // Check if we should account for family size (Phase 2 feature)
        // For now, default to current behavior (families as units) unless accountForFamilySize is true
        const shouldAccountForSize = accountForFamilySize ?? false

        if (shouldAccountForSize) {
          // Count total people across families
          let totalPeople = 0
          distribution.families.forEach(familyId => {
            const family = families.find(f => f.id === familyId)
            if (family) {
              totalPeople += family.adults + family.children
            }
          })

          const perPersonShare = amount / totalPeople

          distribution.families.forEach(familyId => {
            const family = families.find(f => f.id === familyId)
            if (family) {
              const familySize = family.adults + family.children
              const familyShare = perPersonShare * familySize
              entries.push({
                id: familyId,
                name: family.family_name,
                amount: familyShare,
                isFamily: true,
                peopleCount: familySize,
                perPersonAmount: perPersonShare,
              })
            }
          })
        } else {
          // Treat families as units (current behavior)
          const shareCount = distribution.families.length
          const shareAmount = amount / shareCount

          distribution.families.forEach(familyId => {
            const family = families.find(f => f.id === familyId)
            if (family) {
              const familySize = family.adults + family.children
              entries.push({
                id: familyId,
                name: family.family_name,
                amount: shareAmount,
                isFamily: true,
                peopleCount: familySize,
                perPersonAmount: shareAmount / familySize,
              })
            }
          })
        }
      } else if (splitMode === 'percentage' && distribution.familySplits) {
        distribution.familySplits.forEach(split => {
          const family = families.find(f => f.id === split.familyId)
          if (family) {
            const shareAmount = (amount * split.value) / 100
            const familySize = family.adults + family.children
            entries.push({
              id: split.familyId,
              name: family.family_name,
              amount: shareAmount,
              isFamily: true,
              peopleCount: familySize,
              perPersonAmount: shareAmount / familySize,
            })
          }
        })
      } else if (splitMode === 'amount' && distribution.familySplits) {
        distribution.familySplits.forEach(split => {
          const family = families.find(f => f.id === split.familyId)
          if (family) {
            const familySize = family.adults + family.children
            entries.push({
              id: split.familyId,
              name: family.family_name,
              amount: split.value,
              isFamily: true,
              peopleCount: familySize,
              perPersonAmount: split.value / familySize,
            })
          }
        })
      }
    } else if (distribution.type === 'mixed') {
      if (splitMode === 'equal') {
        // CRITICAL: Filter out family members from participants to avoid double-counting
        const standaloneParticipants = distribution.participants.filter(participantId => {
          const participant = participants.find(p => p.id === participantId)
          if (!participant) return false
          if (participant.family_id === null) return true
          return !distribution.families.includes(participant.family_id)
        })

        let totalPeople = standaloneParticipants.length

        distribution.families.forEach(familyId => {
          const family = families.find(f => f.id === familyId)
          if (family) {
            totalPeople += family.adults + family.children
          }
        })

        const perPersonShare = amount / totalPeople

        // Add families
        distribution.families.forEach(familyId => {
          const family = families.find(f => f.id === familyId)
          if (family) {
            const familySize = family.adults + family.children
            const familyShare = perPersonShare * familySize
            entries.push({
              id: familyId,
              name: family.family_name,
              amount: familyShare,
              isFamily: true,
              peopleCount: familySize,
              perPersonAmount: perPersonShare,
            })
          }
        })

        // Add ONLY standalone individuals
        standaloneParticipants.forEach(participantId => {
          const participant = participants.find(p => p.id === participantId)
          if (participant) {
            entries.push({
              id: participantId,
              name: participant.name,
              amount: perPersonShare,
              isFamily: false,
            })
          }
        })
      } else if (splitMode === 'percentage') {
        // Add families by percentage
        if (distribution.familySplits) {
          distribution.familySplits.forEach(split => {
            const family = families.find(f => f.id === split.familyId)
            if (family) {
              const shareAmount = (amount * split.value) / 100
              const familySize = family.adults + family.children
              entries.push({
                id: split.familyId,
                name: family.family_name,
                amount: shareAmount,
                isFamily: true,
                peopleCount: familySize,
                perPersonAmount: shareAmount / familySize,
              })
            }
          })
        }

        // Add ONLY standalone individuals by percentage
        if (distribution.participantSplits) {
          const standaloneSplits = distribution.participantSplits.filter(split => {
            const participant = participants.find(p => p.id === split.participantId)
            if (!participant) return false
            if (participant.family_id === null) return true
            return !distribution.families.includes(participant.family_id)
          })

          standaloneSplits.forEach(split => {
            const participant = participants.find(p => p.id === split.participantId)
            if (participant) {
              const shareAmount = (amount * split.value) / 100
              entries.push({
                id: split.participantId,
                name: participant.name,
                amount: shareAmount,
                isFamily: false,
              })
            }
          })
        }
      } else if (splitMode === 'amount') {
        // Add families by amount
        if (distribution.familySplits) {
          distribution.familySplits.forEach(split => {
            const family = families.find(f => f.id === split.familyId)
            if (family) {
              const familySize = family.adults + family.children
              entries.push({
                id: split.familyId,
                name: family.family_name,
                amount: split.value,
                isFamily: true,
                peopleCount: familySize,
                perPersonAmount: split.value / familySize,
              })
            }
          })
        }

        // Add ONLY standalone individuals by amount
        if (distribution.participantSplits) {
          const standaloneSplits = distribution.participantSplits.filter(split => {
            const participant = participants.find(p => p.id === split.participantId)
            if (!participant) return false
            if (participant.family_id === null) return true
            return !distribution.families.includes(participant.family_id)
          })

          standaloneSplits.forEach(split => {
            const participant = participants.find(p => p.id === split.participantId)
            if (participant) {
              entries.push({
                id: split.participantId,
                name: participant.name,
                amount: split.value,
                isFamily: false,
              })
            }
          })
        }
      }
    }

    return entries
  }, [amount, distribution, participants, families, accountForFamilySize])

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
              {entry.isFamily ? (
                <Users size={16} className="text-muted-foreground flex-shrink-0" />
              ) : (
                <User size={16} className="text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{entry.name}</p>
                {entry.isFamily && entry.peopleCount && entry.perPersonAmount && (
                  <p className="text-xs text-muted-foreground">
                    {entry.peopleCount} {entry.peopleCount === 1 ? 'person' : 'people'} ×{' '}
                    {formatAmount(entry.perPersonAmount)}
                  </p>
                )}
              </div>
              {entry.isFamily && (
                <Badge variant="outline" className="text-xs">
                  Family
                </Badge>
              )}
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
