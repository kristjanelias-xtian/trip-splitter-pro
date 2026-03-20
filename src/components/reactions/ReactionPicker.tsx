// SPDX-License-Identifier: Apache-2.0
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { REACTION_EMOJI } from '@/types/reaction'
import { useState } from 'react'

interface ReactionPickerProps {
  onSelect: (emoji: string) => void
  alreadyReacted: string[]
}

export function ReactionPicker({ onSelect, alreadyReacted }: ReactionPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="bg-transparent border border-dashed border-border text-muted-foreground px-2 py-0.5 rounded-full text-sm hover:bg-muted/50 transition-colors"
          aria-label="Add reaction"
        >
          +
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto p-2 flex gap-1"
      >
        {REACTION_EMOJI.map(emoji => {
          const used = alreadyReacted.includes(emoji)
          return (
            <button
              key={emoji}
              onClick={() => {
                if (!used) {
                  onSelect(emoji)
                  setOpen(false)
                }
              }}
              disabled={used}
              className="text-xl p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
