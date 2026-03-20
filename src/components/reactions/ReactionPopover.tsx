// SPDX-License-Identifier: Apache-2.0
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useMemo, useState } from 'react'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { buildShortNameMap } from '@/lib/participantUtils'

interface ReactionPopoverProps {
  emoji: string
  count: number
  participantIds: string[]
  isMine: boolean
  onRemove: () => void
  children: React.ReactNode
}

export function ReactionPopover({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emoji: _emoji,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  count: _count,
  participantIds,
  isMine,
  onRemove,
  children,
}: ReactionPopoverProps) {
  const [open, setOpen] = useState(false)
  const { participants } = useParticipantContext()
  const shortNames = useMemo(() => buildShortNameMap(participants), [participants])

  const names = participantIds
    .map(id => shortNames.get(id))
    .filter(Boolean)
    .join(', ')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" className="w-auto p-2 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground">{names}</span>
          {isMine && (
            <button
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
              className="text-xs text-destructive hover:underline text-left"
            >
              Remove
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
