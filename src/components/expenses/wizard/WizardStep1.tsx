import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
          <div className="relative flex-1">
            <Input
              type="text"
              id="amount"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value.replace(',', '.'))}
              className={`text-2xl h-14 tabular-nums ${currencies.length === 1 ? 'pr-16' : ''}`}
              placeholder="0.00"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              required
              disabled={disabled}
            />
            {currencies.length === 1 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground">
                {currency}
              </span>
            )}
          </div>
          {currencies.length > 1 && (
            <div className="flex gap-1 items-center">
              {currencies.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onCurrencyChange(c)}
                  disabled={disabled}
                  className={`h-14 px-3 text-sm rounded-md border transition-colors ${
                    currency === c
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the total amount spent
        </p>
      </div>
    </motion.div>
  )
}
