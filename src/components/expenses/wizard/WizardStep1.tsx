import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'

interface WizardStep1Props {
  description: string
  amount: string
  currency: string
  onDescriptionChange: (value: string) => void
  onAmountChange: (value: string) => void
  onCurrencyChange: (value: string) => void
  availableCurrencies?: string[]
  disabled?: boolean
}

export function WizardStep1({
  description,
  amount,
  currency,
  onDescriptionChange,
  onAmountChange,
  onCurrencyChange,
  availableCurrencies,
  disabled = false,
}: WizardStep1Props) {
  const currencies = availableCurrencies && availableCurrencies.length > 0
    ? availableCurrencies
    : ['EUR', 'USD', 'GBP', 'THB']
  const descriptionRef = useRef<HTMLInputElement>(null)

  // Auto-focus description on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      descriptionRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <motion.div
      className="space-y-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Description
        </Label>
        <Input
          ref={descriptionRef}
          type="text"
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g., Dinner at restaurant"
          className="h-12 text-base"
          autoCapitalize="sentences"
          required
          disabled={disabled}
        />
      </div>

      {/* Amount and Currency */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base font-medium">
          Amount
        </Label>
        <div className="flex gap-3">
          <Input
            type="text"
            id="amount"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value.replace(',', '.'))}
            className="flex-1 text-2xl h-14 tabular-nums"
            placeholder="0.00"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            required
            disabled={disabled}
          />
          <Select
            value={currency}
            onValueChange={onCurrencyChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-28 h-14 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the total amount spent
        </p>
      </div>
    </motion.div>
  )
}
