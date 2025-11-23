import { motion } from 'framer-motion'
import {
  UtensilsCrossed,
  Home,
  Car,
  Target,
  Dumbbell,
  Bookmark,
  Edit,
  Trash2,
  Calendar,
  Tag,
} from 'lucide-react'
import { Expense } from '@/types/expense'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface ExpenseCardProps {
  expense: Expense
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { participants, families } = useParticipantContext()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const getPaidByName = () => {
    const participant = participants.find(p => p.id === expense.paid_by)
    return participant?.name || 'Unknown'
  }

  const getDistributionText = () => {
    const dist = expense.distribution

    if (dist.type === 'individuals') {
      const names = dist.participants
        .map(id => participants.find(p => p.id === id)?.name)
        .filter(Boolean)
      if (names.length === participants.length) {
        return 'Everyone'
      }
      return names.join(', ')
    }

    if (dist.type === 'families') {
      const names = dist.families
        .map(id => families.find(f => f.id === id)?.family_name)
        .filter(Boolean)
      if (names.length === families.length) {
        return 'All families'
      }
      return names.join(', ')
    }

    if (dist.type === 'mixed') {
      const familyNames = (dist.families || [])
        .map(id => families.find(f => f.id === id)?.family_name)
        .filter(Boolean)
      const participantNames = (dist.participants || [])
        .map(id => participants.find(p => p.id === id)?.name)
        .filter(Boolean)
      return [...familyNames, ...participantNames].join(', ')
    }

    return 'Unknown'
  }

  const getCategoryIcon = (category: string) => {
    const iconProps = { size: 20, className: 'text-primary' }
    const icons: Record<string, JSX.Element> = {
      Food: <UtensilsCrossed {...iconProps} />,
      Accommodation: <Home {...iconProps} />,
      Transport: <Car {...iconProps} />,
      Activities: <Target {...iconProps} />,
      Training: <Dumbbell {...iconProps} />,
      Other: <Bookmark {...iconProps} />,
    }
    return icons[category] || <Bookmark {...iconProps} />
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getCategoryIcon(expense.category)}</div>
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {expense.description}
                </h3>

                <p className="text-sm text-muted-foreground">
                  Paid by <span className="font-medium text-foreground">{getPaidByName()}</span>
                </p>

                <p className="text-xs text-muted-foreground">
                  Split: {getDistributionText()}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>{formatDate(expense.expense_date)}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline" className="h-5">
                    <Tag size={10} className="mr-1" />
                    {expense.category}
                  </Badge>
                </div>

                {expense.comment && (
                  <p className="text-xs text-muted-foreground italic bg-accent/10 px-2 py-1 rounded">
                    {expense.comment}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="text-xl font-bold text-foreground whitespace-nowrap tabular-nums">
              {formatAmount(expense.amount, expense.currency)}
            </div>
            <div className="flex gap-1">
              <Button
                onClick={onEdit}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0"
                title="Edit expense"
              >
                <Edit size={16} />
              </Button>
              <Button
                onClick={onDelete}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete expense"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
