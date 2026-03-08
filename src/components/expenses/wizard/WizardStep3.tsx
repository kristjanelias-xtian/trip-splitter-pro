// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { fadeInUp } from '@/lib/animations'
import { buildShortNameMap } from '@/lib/participantUtils'
import { getParticipantColor } from '@/lib/participantChipColors'
import { ExpenseSplitPreview } from '../ExpenseSplitPreview'
import type { ExpenseDistribution } from '@/types/expense'
import type { Participant as FullParticipant } from '@/types/participant'

type SplitMode = 'equal' | 'percentage' | 'amount'

interface Participant {
  id: string
  name: string
  nickname?: string | null
  is_adult: boolean
  wallet_group?: string | null
  avatar_url?: string | null
}

interface WizardStep2Props {
  participants: Participant[]
  selectedParticipants: string[]
  onParticipantToggle: (id: string) => void
  onGroupToggle: (memberIds: string[]) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  accountForFamilySize: boolean
  onAccountForFamilySizeChange: (value: boolean) => void
  splitMode: SplitMode
  onSplitModeChange: (mode: SplitMode) => void
  expenseDate: string
  onExpenseDateChange: (date: string) => void
  comment: string
  onCommentChange: (comment: string) => void
  disabled?: boolean
  amount?: string
  currency?: string
}

export function WizardStep3({
  participants,
  selectedParticipants,
  onParticipantToggle,
  onGroupToggle,
  onSelectAll,
  onDeselectAll,
  accountForFamilySize,
  onAccountForFamilySizeChange,
  splitMode,
  onSplitModeChange,
  expenseDate,
  onExpenseDateChange,
  comment,
  onCommentChange,
  disabled = false,
  amount,
  currency,
}: WizardStep2Props) {
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])
  const [showDetails, setShowDetails] = useState(false)

  const allSelected = selectedParticipants.length === participants.length

  // Show toggle only when any selected participant belongs to a wallet_group
  const hasSelectedGroups = useMemo(() => {
    const selectedSet = new Set(selectedParticipants)
    return participants.some(p => selectedSet.has(p.id) && !!p.wallet_group)
  }, [selectedParticipants, participants])

  // Group participants by wallet_group for display
  const participantGroups = useMemo(() => {
    const groups: { label: string | null; isWalletGroup: boolean; members: Participant[] }[] = []
    const grouped = new Map<string, Participant[]>()
    const standalone: Participant[] = []

    for (const p of participants) {
      if (p.wallet_group) {
        const existing = grouped.get(p.wallet_group) || []
        existing.push(p)
        grouped.set(p.wallet_group, existing)
      } else {
        standalone.push(p)
      }
    }

    for (const [label, members] of grouped) {
      groups.push({ label, isWalletGroup: true, members })
    }
    if (standalone.length > 0) {
      groups.push({ label: grouped.size > 0 ? 'Others' : null, isWalletGroup: false, members: standalone })
    }

    return groups
  }, [participants])

  // Flat color index for each participant across all groups
  const participantColorMap = useMemo(() => {
    const map = new Map<string, number>()
    let i = 0
    for (const group of participantGroups) {
      for (const p of group.members) {
        map.set(p.id, i++)
      }
    }
    return map
  }, [participantGroups])

  return (
    <motion.div
      className="space-y-5"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Participant chips */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label className="text-base font-medium">Split between</Label>
          <button
            type="button"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            disabled={disabled}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="rounded-lg border border-input p-3 space-y-3">
          {participantGroups.map((group, gi) => {
            const memberIds = group.members.map(m => m.id)
            const allGroupSelected = memberIds.every(id => selectedParticipants.includes(id))

            return (
              <div key={group.label ?? `standalone-${gi}`}>
                {group.label && (
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                    {group.isWalletGroup && (
                      <button
                        type="button"
                        onClick={() => onGroupToggle(memberIds)}
                        disabled={disabled}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        {allGroupSelected ? `deselect ${group.label}` : `select ${group.label}`}
                      </button>
                    )}
                  </div>
                )}
                <div className={group.isWalletGroup
                  ? 'border-l-2 border-primary/30 pl-3 flex flex-wrap gap-2'
                  : 'flex flex-wrap gap-2'
                }>
                  {group.members.map(participant => {
                    const isSelected = selectedParticipants.includes(participant.id)
                    const isChild = !participant.is_adult
                    const color = getParticipantColor(participantColorMap.get(participant.id) ?? 0)
                    return (
                      <button
                        key={participant.id}
                        type="button"
                        onClick={() => onParticipantToggle(participant.id)}
                        disabled={disabled}
                        className={`inline-flex items-center gap-1.5 h-8 pl-1 pr-3 text-sm rounded-full border transition-colors ${
                          isSelected
                            ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-500 dark:border-slate-500'
                            : isChild
                              ? 'bg-background text-muted-foreground border-dashed border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                              : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                        }`}
                      >
                        <ParticipantAvatar participant={participant} size="sm" className={color.avatar} />
                        {shortNames.get(participant.id) || participant.name}
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Split method pills */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Split method</Label>
        <div className="flex gap-1.5">
          {([['equal', 'Equal'], ['percentage', 'By %'], ['amount', 'By Amount']] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSplitModeChange(mode)}
              disabled={disabled}
              className={`h-8 px-3 text-sm rounded-full border transition-colors ${
                splitMode === mode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-input hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Wallet group toggle — only when wallet_group participants are selected */}
      {hasSelectedGroups && (
        <div className="flex items-center space-x-3 min-h-[44px] py-1">
          <Checkbox
            id="accountForFamilySize-wizard"
            checked={accountForFamilySize}
            onCheckedChange={(checked) => onAccountForFamilySizeChange(checked as boolean)}
            disabled={disabled}
          />
          <div>
            <label htmlFor="accountForFamilySize-wizard" className="text-sm text-foreground cursor-pointer">
              Split equally between groups
            </label>
            <p className="text-xs text-muted-foreground">Each group pays the same share, regardless of how many members it has</p>
          </div>
        </div>
      )}

      {/* Split Preview */}
      {amount && currency && parseFloat(amount) > 0 && selectedParticipants.length > 0 && (() => {
        const previewDistribution: ExpenseDistribution = {
          type: 'individuals',
          participants: selectedParticipants,
          splitMode,
          accountForFamilySize: hasSelectedGroups ? accountForFamilySize : undefined,
        }

        return (
          <ExpenseSplitPreview
            amount={parseFloat(amount)}
            currency={currency}
            distribution={previewDistribution}
            participants={participants as unknown as FullParticipant[]}
          />
        )
      })()}

      {/* Collapsible "More details" */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          disabled={disabled}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          More details
          <span className="text-xs">(date, comment)</span>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="expenseDate" className="text-sm font-medium">
                  Date
                </Label>
                <Input
                  type="date"
                  id="expenseDate"
                  value={expenseDate}
                  onChange={(e) => onExpenseDateChange(e.target.value)}
                  className="h-10 text-base"
                  disabled={disabled}
                />
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-sm font-medium">
                  Comment (optional)
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  className="text-base resize-none"
                  disabled={disabled}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
