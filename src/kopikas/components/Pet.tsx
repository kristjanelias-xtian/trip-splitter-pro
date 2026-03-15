// SPDX-License-Identifier: Apache-2.0
import type { MoodTier } from '../types'

interface PetProps {
  mood: MoodTier
  level: number
  starterEmoji: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }
const EMOJI_SIZE_MAP = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-5xl' }

const MOOD_STYLES: Record<MoodTier, { bg: string; animation: string }> = {
  ecstatic: { bg: 'from-purple-400 via-pink-400 to-purple-500', animation: 'animate-bounce' },
  happy: { bg: 'from-purple-500 via-indigo-400 to-purple-400', animation: 'animate-pulse' },
  neutral: { bg: 'from-gray-400 via-purple-300 to-gray-400', animation: '' },
  worried: { bg: 'from-gray-500 via-gray-400 to-gray-500', animation: '' },
}

export function Pet({ mood, level, starterEmoji, size = 'md' }: PetProps) {
  const { bg, animation } = MOOD_STYLES[mood]

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Crown for level 4+ */}
      {level >= 4 && (
        <span className="text-lg -mb-2 z-10">👑</span>
      )}

      {/* Main blob */}
      <div
        className={`${SIZE_MAP[size]} rounded-full bg-gradient-to-br ${bg} ${animation}
          flex items-center justify-center relative
          ${level >= 5 ? 'shadow-lg shadow-purple-500/50 ring-2 ring-purple-400/30' : ''}
          ${level >= 3 ? 'shadow-md shadow-purple-400/30' : ''}
          ${mood === 'worried' ? 'opacity-80 scale-95' : ''}
          transition-all duration-500`}
      >
        {/* Starter emoji */}
        <span className={EMOJI_SIZE_MAP[size]}>{starterEmoji}</span>

        {/* Eyes */}
        <div className="absolute top-1/4 left-1/4 flex gap-2">
          <div className={`w-1.5 h-1.5 rounded-full bg-white/80 ${mood === 'worried' ? 'translate-y-0.5' : ''}`} />
          <div className={`w-1.5 h-1.5 rounded-full bg-white/80 ${mood === 'worried' ? 'translate-y-0.5' : ''}`} />
        </div>

        {/* Mouth for level 2+ */}
        {level >= 2 && (
          <div className={`absolute bottom-1/3 w-3 h-1.5 rounded-b-full
            ${mood === 'worried' ? 'border-b border-white/40 rounded-b-none rounded-t-full' : 'bg-white/40'}`}
          />
        )}

        {/* Blush marks for level 3+ */}
        {level >= 3 && mood !== 'worried' && (
          <>
            <div className="absolute left-1 top-1/2 w-2 h-1 rounded-full bg-pink-300/40" />
            <div className="absolute right-1 top-1/2 w-2 h-1 rounded-full bg-pink-300/40" />
          </>
        )}
      </div>

      {/* Sparkle trail for level 5 */}
      {level >= 5 && (
        <div className="absolute -top-1 -right-1 animate-ping">
          <span className="text-xs">✨</span>
        </div>
      )}

      {/* Ecstatic sparkles */}
      {mood === 'ecstatic' && (
        <div className="absolute -top-2 animate-pulse">
          <span className="text-sm">✨</span>
        </div>
      )}
    </div>
  )
}
