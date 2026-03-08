// SPDX-License-Identifier: Apache-2.0
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Users, Check } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { fadeInUp } from '@/lib/animations'
import { buildShortNameMap } from '@/lib/participantUtils'
import { ParticipantAvatar } from '@/components/ParticipantAvatar'

interface Participant {
  id: string
  name: string
  nickname?: string | null
  is_adult: boolean
  wallet_group?: string | null
  avatar_url?: string | null
}

interface WizardStep3Props {
  participants: Participant[]
  selectedParticipants: string[]
  onParticipantToggle: (id: string) => void
  onGroupToggle: (memberIds: string[]) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onAdvancedClick: () => void
  accountForFamilySize: boolean
  onAccountForFamilySizeChange: (value: boolean) => void
  disabled?: boolean
}

export function WizardStep3({
  participants,
  selectedParticipants,
  onParticipantToggle,
  onGroupToggle,
  onSelectAll,
  onDeselectAll,
  onAdvancedClick,
  accountForFamilySize,
  onAccountForFamilySizeChange,
  disabled = false,
}: WizardStep3Props) {
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])
  const [showDetails, setShowDetails] = useState(false)

  // Show toggle only when any selected participant belongs to a wallet_group
  const hasSelectedGroups = useMemo(() => {
    const selectedSet = new Set(selectedParticipants)
    return participants.some(p => selectedSet.has(p.id) && !!p.wallet_group)
  }, [selectedParticipants, participants])

  const allSelected = selectedParticipants.length === participants.length

  const getSelectionText = () => {
    if (allSelected) {
      return `Split equally between all ${participants.length} people`
    }
    return `Split between ${selectedParticipants.length} selected`
  }

  // Group participants by wallet_group for display
  const participantGroups = (() => {
    const groups: { label: string | null; members: Participant[] }[] = []
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
      groups.push({ label, members })
    }
    if (standalone.length > 0) {
      groups.push({ label: null, members: standalone })
    }

    return groups
  })()

  return (
    <motion.div
      className="space-y-6"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {/* Summary Card */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{getSelectionText()}</p>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={disabled}
          className="h-11 px-3 text-sm flex-1"
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          disabled={disabled}
          className="h-11 px-3 text-sm flex-1"
        >
          Deselect All
        </Button>
      </div>

      {/* Choose Specific People */}
      <div className="space-y-3">
        <Button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
          className="w-full h-12 justify-between"
          disabled={disabled}
        >
          <span>Choose specific people</span>
          {showDetails ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </Button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 overflow-hidden"
            >
              <div className="space-y-2">
                <Label className="text-base font-medium">Participants</Label>
                <div className="space-y-2 rounded-lg border border-input p-3">
                  {participantGroups.map((group, gi) => {
                    const memberIds = group.members.map(m => m.id)
                    const selectedCount = memberIds.filter(id => selectedParticipants.includes(id)).length
                    const allGroupSelected = selectedCount === memberIds.length
                    const someGroupSelected = selectedCount > 0 && !allGroupSelected

                    return (
                      <div
                        key={group.label ?? `standalone-${gi}`}
                        className={group.label ? 'border-l-2 border-primary/30 pl-3 mt-2 first:mt-0' : ''}
                      >
                        {group.label && (
                          <div
                            role="checkbox"
                            aria-checked={someGroupSelected ? 'mixed' : allGroupSelected}
                            className="flex items-center space-x-3 min-h-[44px] py-1 cursor-pointer"
                            onClick={() => onGroupToggle(memberIds)}
                          >
                            <span
                              className={`grid place-content-center h-4 w-4 shrink-0 rounded-sm border border-primary shadow ${allGroupSelected ? 'bg-primary text-primary-foreground' : ''} ${someGroupSelected ? 'opacity-60' : ''}`}
                            >
                              {allGroupSelected && <Check className="h-4 w-4" />}
                            </span>
                            <span className="text-sm font-medium text-foreground flex-1 flex items-center gap-1.5">
                              <Users size={14} className="text-muted-foreground" />
                              {group.label}
                              <span className="text-xs text-muted-foreground font-normal">
                                ({memberIds.length})
                              </span>
                            </span>
                          </div>
                        )}
                        {group.members.map((participant) => (
                          <div
                            key={participant.id}
                            className={`flex items-center space-x-3 min-h-[44px] py-1 ${group.label ? 'pl-6' : ''}`}
                          >
                            <Checkbox
                              id={`participant-${participant.id}`}
                              checked={selectedParticipants.includes(participant.id)}
                              onCheckedChange={() => onParticipantToggle(participant.id)}
                              disabled={disabled}
                            />
                            <label
                              htmlFor={`participant-${participant.id}`}
                              className="text-base text-foreground cursor-pointer flex-1 flex items-center gap-2"
                            >
                              <ParticipantAvatar participant={participant} size="sm" />
                              {shortNames.get(participant.id) || participant.name}
                              {!participant.is_adult && (
                                <span className="text-sm text-muted-foreground">
                                  (child)
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Proportional group toggle — only when wallet_group participants are selected */}
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

      {/* Advanced Options */}
      <div className="pt-4 border-t border-border">
        <Button
          type="button"
          onClick={onAdvancedClick}
          variant="outline"
          className="w-full h-12"
          disabled={disabled}
        >
          Advanced Options
          <span className="text-xs text-muted-foreground ml-2">
            (custom split, date, category)
          </span>
        </Button>
      </div>
    </motion.div>
  )
}
