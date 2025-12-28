import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { fadeInUp } from '@/lib/animations'

interface Participant {
  id: string
  name: string
  is_adult: boolean
}

interface Family {
  id: string
  family_name: string
  adults: number
  children: number
}

interface WizardStep3Props {
  isIndividualsMode: boolean
  participants: Participant[]
  families: Family[]
  selectedParticipants: string[]
  selectedFamilies: string[]
  onParticipantToggle: (id: string) => void
  onFamilyToggle: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  accountForFamilySize: boolean
  onAccountForFamilySizeChange: (value: boolean) => void
  onAdvancedClick: () => void
  disabled?: boolean
}

export function WizardStep3({
  isIndividualsMode,
  participants,
  families,
  selectedParticipants,
  selectedFamilies,
  onParticipantToggle,
  onFamilyToggle,
  onSelectAll,
  onDeselectAll,
  accountForFamilySize,
  onAccountForFamilySizeChange,
  onAdvancedClick,
  disabled = false,
}: WizardStep3Props) {
  const [showDetails, setShowDetails] = useState(false)
  const [showFamilies, setShowFamilies] = useState(true)

  // Calculate counts
  const totalParticipants = participants.length
  const totalFamilies = families.length
  const selectedCount = isIndividualsMode
    ? selectedParticipants.length
    : selectedFamilies.length + selectedParticipants.length

  const allSelected = isIndividualsMode
    ? selectedParticipants.length === participants.length
    : selectedFamilies.length === families.length &&
      selectedParticipants.length === participants.length

  const getSelectionText = () => {
    if (allSelected) {
      if (isIndividualsMode) {
        return `Split equally between all ${totalParticipants} people`
      }
      return `Split equally between all ${totalFamilies} families${
        totalParticipants > 0 ? ` and ${totalParticipants} individuals` : ''
      }`
    }
    return `Split between ${selectedCount} selected`
  }

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

      {/* Account for Family Size Toggle - Only show in families mode with families selected */}
      {!isIndividualsMode && selectedFamilies.length > 0 && (
        <div className="p-3 bg-accent/5 rounded-lg border border-accent/10">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accountForFamilySize-mobile"
              checked={accountForFamilySize}
              onCheckedChange={(checked) => onAccountForFamilySizeChange(checked as boolean)}
              disabled={disabled}
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="accountForFamilySize-mobile"
                className="text-sm font-medium text-foreground cursor-pointer leading-none"
              >
                Account for family size
              </label>
              <p className="text-xs text-muted-foreground">
                {accountForFamilySize
                  ? 'Families pay proportionally by number of people (e.g., family of 4 pays 2× family of 2)'
                  : 'All families pay equally regardless of size'}
              </p>
            </div>
          </div>
        </div>
      )}

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
              {isIndividualsMode ? (
                // Individuals Mode
                <div className="space-y-2">
                  <Label className="text-base font-medium">Participants</Label>
                  <div className="space-y-2 rounded-lg border border-input p-3">
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center space-x-3 min-h-[44px] py-1"
                      >
                        <Checkbox
                          id={`participant-${participant.id}`}
                          checked={selectedParticipants.includes(participant.id)}
                          onCheckedChange={() => onParticipantToggle(participant.id)}
                          disabled={disabled}
                        />
                        <label
                          htmlFor={`participant-${participant.id}`}
                          className="text-base text-foreground cursor-pointer flex-1"
                        >
                          {participant.name}
                          {!participant.is_adult && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (child)
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Families Mode
                <div className="space-y-4">
                  {/* Families Section */}
                  {families.length > 0 && (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        onClick={() => setShowFamilies(!showFamilies)}
                        variant="ghost"
                        className="w-full justify-between h-10 px-0"
                        disabled={disabled}
                      >
                        <Label className="text-base font-medium cursor-pointer">
                          Families ({families.length})
                        </Label>
                        {showFamilies ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </Button>

                      <AnimatePresence>
                        {showFamilies && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 rounded-lg border border-input p-3 overflow-hidden"
                          >
                            {families.map((family) => (
                              <div
                                key={family.id}
                                className="flex items-center space-x-3 min-h-[44px] py-1"
                              >
                                <Checkbox
                                  id={`family-${family.id}`}
                                  checked={selectedFamilies.includes(family.id)}
                                  onCheckedChange={() => onFamilyToggle(family.id)}
                                  disabled={disabled}
                                />
                                <label
                                  htmlFor={`family-${family.id}`}
                                  className="text-base text-foreground cursor-pointer flex-1"
                                >
                                  {family.family_name}
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({family.adults} adults
                                    {family.children > 0 && `, ${family.children} children`})
                                  </span>
                                </label>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Individual Members Section */}
                  {participants.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-base font-medium">
                        Individual Members ({participants.length})
                      </Label>
                      <div className="space-y-2 rounded-lg border border-input p-3">
                        {participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center space-x-3 min-h-[44px] py-1"
                          >
                            <Checkbox
                              id={`individual-${participant.id}`}
                              checked={selectedParticipants.includes(participant.id)}
                              onCheckedChange={() => onParticipantToggle(participant.id)}
                              disabled={disabled}
                            />
                            <label
                              htmlFor={`individual-${participant.id}`}
                              className="text-base text-foreground cursor-pointer flex-1"
                            >
                              {participant.name}
                              {!participant.is_adult && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  (child)
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
