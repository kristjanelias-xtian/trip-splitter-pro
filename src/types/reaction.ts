// SPDX-License-Identifier: Apache-2.0

export const REACTION_EMOJI = ['👍', '👎', '😂', '🔥', '😱', '💸'] as const

export type ReactionEmoji = (typeof REACTION_EMOJI)[number]

export interface Reaction {
  id: string
  expense_id: string
  participant_id: string
  emoji: ReactionEmoji
  created_at: string
}

/** Aggregated reactions for a single expense, keyed by emoji */
export interface ExpenseReactions {
  [emoji: string]: {
    count: number
    participantIds: string[]
  }
}
