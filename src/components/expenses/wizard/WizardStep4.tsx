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
}: WizardStep4Props) {
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

        {splitMode !== 'equal' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Note: You'll need to specify values for each participant in the previous step
            </p>
          </div>
        )}
      </div>

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
