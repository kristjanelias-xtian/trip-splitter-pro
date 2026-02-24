import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'
import type { Participant } from '@/types/participant'

type ExpenseCategory = 'Food' | 'Accommodation' | 'Transport' | 'Activities' | 'Training' | 'Other'
type SplitMode = 'equal' | 'percentage' | 'amount'

const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Accommodation',
  'Transport',
  'Activities',
  'Training',
  'Other',
]

interface WizardStep4Props {
  splitMode: SplitMode
  onSplitModeChange: (mode: SplitMode) => void
  category: string
  onCategoryChange: (category: string) => void
  expenseDate: string
  onExpenseDateChange: (date: string) => void
  comment: string
  onCommentChange: (comment: string) => void
  disabled?: boolean
  // Custom split props
  amount?: string
  currency?: string
  participants?: Participant[]
  selectedParticipants?: string[]
  participantSplitValues?: Record<string, string>
  onParticipantSplitChange?: (id: string, value: string) => void
}

export function WizardStep4({
  splitMode,
  onSplitModeChange,
  category,
  onCategoryChange,
  expenseDate,
  onExpenseDateChange,
  comment,
  onCommentChange,
  disabled = false,
  amount,
  currency,
  participants,
  selectedParticipants,
  participantSplitValues,
  onParticipantSplitChange,
}: WizardStep4Props) {
  // Compute running total for custom split modes
  const computeTotal = () => {
    let total = 0
    if (selectedParticipants && participantSplitValues) {
      for (const id of selectedParticipants) {
        const v = parseFloat(participantSplitValues[id] || '0')
        if (!isNaN(v)) total += v
      }
    }
    return total
  }

  const isSplitValid = () => {
    if (splitMode === 'equal') return true
    const total = computeTotal()
    if (splitMode === 'percentage') return Math.abs(total - 100) <= 0.01
    if (splitMode === 'amount') {
      const amtNum = parseFloat(amount || '0')
      return !isNaN(amtNum) && Math.abs(total - amtNum) <= 0.01
    }
    return true
  }

  const hasCustomSplitProps = participants !== undefined && onParticipantSplitChange !== undefined

  const handleDistributeEvenly = () => {
    const target = splitMode === 'percentage' ? 100 : parseFloat(amount || '0')
    if (isNaN(target) || target <= 0) return

    if (!selectedParticipants || selectedParticipants.length === 0) return

    const count = selectedParticipants.length
    const base = Math.floor((target / count) * 100) / 100
    const remainder = Math.round((target - base * count) * 100) / 100

    for (let i = 0; i < count; i++) {
      const id = selectedParticipants[i]
      // Give remainder to the first entry so totals match exactly
      const value = i === 0 ? (base + remainder).toFixed(2) : base.toFixed(2)
      onParticipantSplitChange?.(id, value)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Split Method */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Split Method</Label>
        <RadioGroup
          value={splitMode}
          onValueChange={(value) => onSplitModeChange(value as SplitMode)}
          disabled={disabled}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-primary/50 transition-colors min-h-[48px]">
            <RadioGroupItem value="equal" id="split-equal" className="flex-shrink-0" />
            <label
              htmlFor="split-equal"
              className="flex-1 cursor-pointer text-base font-medium"
            >
              Equal Split
              <p className="text-sm text-muted-foreground font-normal mt-0.5">
                Everyone pays the same amount
              </p>
            </label>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-primary/50 transition-colors min-h-[48px]">
            <RadioGroupItem value="percentage" id="split-percentage" className="flex-shrink-0" />
            <label
              htmlFor="split-percentage"
              className="flex-1 cursor-pointer text-base font-medium"
            >
              By Percentage
              <p className="text-sm text-muted-foreground font-normal mt-0.5">
                Specify % for each person (must sum to 100%)
              </p>
            </label>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:border-primary/50 transition-colors min-h-[48px]">
            <RadioGroupItem value="amount" id="split-amount" className="flex-shrink-0" />
            <label
              htmlFor="split-amount"
              className="flex-1 cursor-pointer text-base font-medium"
            >
              By Amount
              <p className="text-sm text-muted-foreground font-normal mt-0.5">
                Specify exact amount for each person
              </p>
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Custom split inputs */}
      {splitMode !== 'equal' && hasCustomSplitProps && (
        <div className="space-y-3">
          <Label className="text-base font-medium">
            {splitMode === 'percentage' ? 'Percentages' : 'Amounts'}
          </Label>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {splitMode === 'percentage'
                ? 'Enter percentages for each party (must sum to 100%)'
                : `Enter amounts for each party (must sum to ${currency || 'EUR'} ${amount || '0.00'})`
              }
            </p>
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
              onClick={handleDistributeEvenly}
              disabled={disabled}
            >
              Split evenly
            </button>
          </div>

          <div className="space-y-1 rounded-lg border border-input p-3">
            {selectedParticipants && selectedParticipants.length > 0 && participants && (
              <>
                {participants
                  .filter(p => selectedParticipants.includes(p.id))
                  .map(participant => (
                    <div key={participant.id} className="flex items-center justify-between min-h-[44px] gap-3">
                      <span className="text-sm text-foreground flex-1">
                        {participant.name} {participant.is_adult ? '' : '(child)'}
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={participantSplitValues?.[participant.id] || ''}
                        onChange={(e) => onParticipantSplitChange?.(participant.id, e.target.value.replace(',', '.'))}
                        placeholder={splitMode === 'percentage' ? '%' : currency || 'EUR'}
                        pattern="[0-9]*[.,]?[0-9]*"
                        disabled={disabled}
                        className="w-24 h-10"
                      />
                    </div>
                  ))}
              </>
            )}
          </div>

          {/* Running total indicator */}
          <div className={`p-2 rounded-lg text-sm font-medium ${
            isSplitValid()
              ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300'
              : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
          }`}>
            {splitMode === 'percentage'
              ? `Total: ${computeTotal().toFixed(1)}% / 100%`
              : `Total: ${currency || 'EUR'} ${computeTotal().toFixed(2)} / ${currency || 'EUR'} ${parseFloat(amount || '0').toFixed(2)}`
            }
            {isSplitValid() && ' ✓'}
          </div>
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="expenseDate" className="text-base font-medium">
          Date
        </Label>
        <Input
          type="date"
          id="expenseDate"
          value={expenseDate}
          onChange={(e) => onExpenseDateChange(e.target.value)}
          className="h-12 text-base"
          disabled={disabled}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category" className="text-base font-medium">
          Category
        </Label>
        <Select
          value={category}
          onValueChange={onCategoryChange}
          disabled={disabled}
        >
          <SelectTrigger id="category" className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment" className="text-base font-medium">
          Comment (Optional)
        </Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Additional notes..."
          rows={3}
          className="text-base resize-none"
          disabled={disabled}
        />
      </div>
    </motion.div>
  )
}
