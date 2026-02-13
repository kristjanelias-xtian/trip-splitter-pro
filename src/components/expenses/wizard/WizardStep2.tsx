import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'

interface SuggestedPayer {
  id: string
  name: string
  balance: number
}

interface Participant {
  id: string
  name: string
  is_adult: boolean
}

interface WizardStep2Props {
  paidBy: string
  onPaidByChange: (value: string) => void
  adults: Participant[]
  suggestedPayer?: SuggestedPayer | null
  currency: string
  disabled?: boolean
}

export function WizardStep2({
  paidBy,
  onPaidByChange,
  adults,
  suggestedPayer,
  currency,
  disabled = false,
}: WizardStep2Props) {
  const formatBalance = (balance: number, curr: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'narrowSymbol',
    }).format(Math.abs(balance))
    if (balance < 0) return `-${formatted}`
    if (balance > 0) return `+${formatted}`
    return formatted
  }

  const handleSuggestionClick = () => {
    if (suggestedPayer && !disabled) {
      onPaidByChange(suggestedPayer.id)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Smart Payer Suggestion */}
      {suggestedPayer && (
        <motion.div
          onClick={handleSuggestionClick}
          className="p-4 bg-accent/10 border-2 border-accent/30 rounded-lg
                     cursor-pointer hover:bg-accent/20 active:bg-accent/25 min-h-[60px]
                     transition-colors"
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <Lightbulb size={20} className="text-accent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                <strong>{suggestedPayer.name}</strong> should pay next
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Balance: {formatBalance(suggestedPayer.balance, currency)}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payer Selection */}
      <div className="space-y-2">
        <Label htmlFor="paidBy" className="text-base font-medium">
          Select payer
        </Label>
        <Select
          value={paidBy}
          onValueChange={onPaidByChange}
          disabled={disabled}
        >
          <SelectTrigger id="paidBy" className="h-12 text-base">
            <SelectValue placeholder="Choose who paid..." />
          </SelectTrigger>
          <SelectContent>
            {adults.map((adult) => (
              <SelectItem key={adult.id} value={adult.id}>
                {adult.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Only adults can pay for expenses
        </p>
      </div>
    </motion.div>
  )
}
