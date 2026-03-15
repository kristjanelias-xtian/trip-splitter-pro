// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { fadeInUp } from '@/lib/animations'
import type { Participant } from '@/types/participant'

type SplitMode = 'equal' | 'percentage' | 'amount'

interface WizardStep3Props {
  splitMode: SplitMode
  amount: string
  currency: string
  participants: Participant[]
  selectedParticipants: string[]
  participantSplitValues: Record<string, string>
  onParticipantSplitChange: (id: string, value: string) => void
  disabled?: boolean
}

export function WizardStep4({
  splitMode,
  amount,
  currency,
  participants,
  selectedParticipants,
  participantSplitValues,
  onParticipantSplitChange,
  disabled = false,
}: WizardStep3Props) {
  const { t } = useTranslation()
  const computeTotal = () => {
    let total = 0
    for (const id of selectedParticipants) {
      const v = parseFloat(participantSplitValues[id] || '0')
      if (!isNaN(v)) total += v
    }
    return total
  }

  const isSplitValid = () => {
    const total = computeTotal()
    if (splitMode === 'percentage') return Math.abs(total - 100) <= 0.01
    if (splitMode === 'amount') {
      const amtNum = parseFloat(amount || '0')
      return !isNaN(amtNum) && Math.abs(total - amtNum) <= 0.01
    }
    return true
  }

  const handleDistributeEvenly = () => {
    const target = splitMode === 'percentage' ? 100 : parseFloat(amount || '0')
    if (isNaN(target) || target <= 0 || selectedParticipants.length === 0) return

    const count = selectedParticipants.length
    const base = Math.floor((target / count) * 100) / 100
    const remainder = Math.round((target - base * count) * 100) / 100

    for (let i = 0; i < count; i++) {
      const id = selectedParticipants[i]
      const value = i === 0 ? (base + remainder).toFixed(2) : base.toFixed(2)
      onParticipantSplitChange(id, value)
    }
  }

  return (
    <motion.div
      className="space-y-5"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <div className="space-y-3">
        <Label className="text-base font-medium">
          {splitMode === 'percentage' ? t('expenses.percentages') : t('expenses.amounts')}
        </Label>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {splitMode === 'percentage'
              ? t('expenses.percentageHint')
              : t('expenses.amountHint', { currency, amount: amount || '0.00' })
            }
          </p>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
            onClick={handleDistributeEvenly}
            disabled={disabled}
          >
            {t('expenses.splitEvenly')}
          </button>
        </div>

        <div className="space-y-1 rounded-lg border border-input p-3">
          {participants
            .filter(p => selectedParticipants.includes(p.id))
            .map(participant => (
              <div key={participant.id} className="flex items-center justify-between min-h-[44px] gap-3">
                <span className="text-sm text-foreground flex-1">
                  {participant.name} {participant.is_adult ? '' : t('common.childLabel')}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={participantSplitValues[participant.id] || ''}
                  onChange={(e) => onParticipantSplitChange(participant.id, e.target.value.replace(',', '.'))}
                  placeholder={splitMode === 'percentage' ? '%' : currency}
                  pattern="[0-9]*[.,]?[0-9]*"
                  disabled={disabled}
                  className="w-24 h-10"
                />
              </div>
            ))}
        </div>

        {/* Running total indicator */}
        <div className={`p-2 rounded-lg text-sm font-medium ${
          isSplitValid()
            ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
        }`}>
          {splitMode === 'percentage'
            ? `Total: ${computeTotal().toFixed(1)}% / 100%`
            : `Total: ${currency} ${computeTotal().toFixed(2)} / ${currency} ${parseFloat(amount || '0').toFixed(2)}`
          }
          {isSplitValid() && ' \u2713'}
        </div>
      </div>
    </motion.div>
  )
}
