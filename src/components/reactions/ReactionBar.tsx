// SPDX-License-Identifier: Apache-2.0
import { useReactionContext } from '@/contexts/ReactionContext'
import { useMyParticipant } from '@/hooks/useMyParticipant'
import { ReactionPicker } from './ReactionPicker'
import { ReactionPopover } from './ReactionPopover'

interface ReactionBarProps {
  expenseId: string
}

export function ReactionBar({ expenseId }: ReactionBarProps) {
  const { reactions, addReaction, removeReaction } = useReactionContext()
  const { myParticipant } = useMyParticipant()

  const expenseReactions = reactions.get(expenseId)
  const canReact = !!myParticipant

  // Collect which emoji the current user has already reacted with
  const myReactedEmoji = canReact
    ? Object.entries(expenseReactions || {})
        .filter(([, data]) => data.participantIds.includes(myParticipant.id))
        .map(([emoji]) => emoji)
    : []

  const hasReactions = expenseReactions && Object.keys(expenseReactions).length > 0
  const allUsed = myReactedEmoji.length >= 6

  // State 3: not logged in / not linked — show read-only pills or nothing
  if (!canReact) {
    if (!hasReactions) return null
    return (
      <div className="flex gap-1.5 flex-wrap mt-2">
        {Object.entries(expenseReactions).map(([emoji, data]) => (
          <span
            key={emoji}
            className="bg-muted/50 border border-border px-2 py-0.5 rounded-full text-sm opacity-70"
          >
            {emoji} {data.count}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1.5 items-center flex-wrap mt-2">
      {expenseReactions &&
        Object.entries(expenseReactions).map(([emoji, data]) => {
          const isMine = data.participantIds.includes(myParticipant.id)
          return (
            <ReactionPopover
              key={emoji}
              emoji={emoji}
              count={data.count}
              participantIds={data.participantIds}
              isMine={isMine}
              onRemove={() => removeReaction(expenseId, myParticipant.id, emoji)}
            >
              <button
                className={`px-2 py-0.5 rounded-full text-sm transition-colors ${
                  isMine
                    ? 'bg-primary/15 border border-primary/30 hover:bg-primary/20'
                    : 'bg-muted/50 border border-border hover:bg-muted'
                }`}
              >
                {emoji} {data.count}
              </button>
            </ReactionPopover>
          )
        })}
      {!allUsed && (
        <ReactionPicker
          onSelect={(emoji) => addReaction(expenseId, myParticipant.id, emoji)}
          alreadyReacted={myReactedEmoji}
        />
      )}
    </div>
  )
}
