// SPDX-License-Identifier: Apache-2.0
import type { MoodResult } from '../types'

interface PetSpeechBubbleProps {
  mood: MoodResult
}

function pickMessage(mood: MoodResult): string {
  const { signals } = mood

  // Priority order: specific concerns first, then positive feedback
  if (signals.loggingConsistency === 0) {
    return 'Ma igatsen sind... Lisa midagi! 😴'
  }
  if (signals.categoryDiversity < 0.3) {
    return 'Mul on kõht täis maiustusi! 🍬'
  }
  if (signals.balanceHealth > 0.7 && mood.tier === 'ecstatic') {
    return 'Sa hoiad mind hästi! 🌟'
  }
  if (signals.categoryDiversity > 0.7) {
    return 'Mulle meeldib vaheldus! 🎨'
  }

  // Tier-based defaults
  switch (mood.tier) {
    case 'ecstatic': return 'Mul on super tuju! ✨'
    case 'happy': return 'Tere! 👋'
    case 'neutral': return 'Hmm... 🤔'
    case 'worried': return 'Ole ettevaatlik rahaga... 💭'
  }
}

export function PetSpeechBubble({ mood }: PetSpeechBubbleProps) {
  const message = pickMessage(mood)

  return (
    <div className="relative bg-card border border-border rounded-2xl px-4 py-2 text-sm max-w-[200px]">
      <p className="text-center">{message}</p>
      {/* Speech bubble tail */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-card border-r border-b border-border" />
    </div>
  )
}
