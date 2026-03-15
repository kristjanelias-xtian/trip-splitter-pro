// SPDX-License-Identifier: Apache-2.0
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
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
import { buildShortNameMap } from '@/lib/participantUtils'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'
import { formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import type { ExpenseCategory } from '@/types/expense'

const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Accommodation',
  'Transport',
  'Activities',
  'Training',
  'Other',
]

interface SuggestedPayer {
  id: string
  name: string
  balance: number
}

interface Participant {
  id: string
  name: string
  nickname?: string | null
  is_adult: boolean
  avatar_url?: string | null
}

interface WizardStep1Props {
  description: string
  amount: string
  currency: string
  onDescriptionChange: (value: string) => void
  onAmountChange: (value: string) => void
  onCurrencyChange: (value: string) => void
  availableCurrencies?: string[]
  disabled?: boolean
  // Paid by
  paidBy: string
  onPaidByChange: (value: string) => void
  adults: Participant[]
  // Suggested payer
  suggestedPayer?: SuggestedPayer | null
  hasExpenses: boolean
  tripCurrency: string
  // Category
  category: string
  onCategoryChange: (category: string) => void
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
  paidBy,
  onPaidByChange,
  adults,
  suggestedPayer,
  hasExpenses,
  tripCurrency,
  category,
  onCategoryChange,
}: WizardStep1Props) {
  const { t } = useTranslation()
  const currencies = availableCurrencies && availableCurrencies.length > 0
    ? availableCurrencies
    : ['EUR', 'USD', 'GBP', 'THB']

  const shortNames = useMemo(() => buildShortNameMap(adults), [adults])

  // Only show suggestion when: expenses exist, suggestion differs from current payer, balance is meaningfully negative
  const showSuggestion = suggestedPayer
    && hasExpenses
    && suggestedPayer.id !== paidBy
    && suggestedPayer.balance < -1.0

  return (
    <motion.div
      className="space-y-5"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          {t('expenses.description')}
        </Label>
        <Input
          type="text"
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('expenses.descriptionPlaceholder')}
          className="h-12 text-base"
          autoCapitalize="sentences"
          required
          disabled={disabled}
        />
      </div>

      {/* Amount and Currency */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-base font-medium">
          {t('expenses.amount')}
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
      </div>

      {/* Paid by */}
      <div className="space-y-2">
        <Label htmlFor="paidBy" className="text-base font-medium">
          {t('expenses.paidBy')}
        </Label>
        <Select
          value={paidBy}
          onValueChange={onPaidByChange}
          disabled={disabled}
        >
          <SelectTrigger id="paidBy" className="h-12 text-base">
            <SelectValue placeholder={t('expenses.chooseWhoPaid')} />
          </SelectTrigger>
          <SelectContent>
            {adults.map((adult) => (
              <SelectItem key={adult.id} value={adult.id}>
                <span className="flex items-center gap-2">
                  <ParticipantAvatar participant={adult} size="sm" />
                  {shortNames.get(adult.id) || adult.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showSuggestion && (
          <button
            type="button"
            onClick={() => onPaidByChange(suggestedPayer.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Lightbulb size={12} className="text-accent shrink-0" />
            <span className="truncate">
              <strong className="font-medium text-foreground">{t('expenses.shouldPayNext', { name: suggestedPayer.name })}</strong>
              {' '}
              <span className={getBalanceColorClass(suggestedPayer.balance)}>
                ({formatBalance(suggestedPayer.balance, tripCurrency)})
              </span>
            </span>
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="space-y-2">
        <Label className="text-base font-medium">{t('common.category')}</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              disabled={disabled}
              className={`h-8 px-3 text-sm rounded-full border transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:border-primary/50'
              }`}
            >
              {t(`expenses.category${cat}`)}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
