// SPDX-License-Identifier: Apache-2.0
import type { MoodTier } from '../types'

interface PetProps {
  mood: MoodTier
  level: number
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_PX = { sm: 64, md: 96, lg: 128 } as const

const LEVEL_GRADIENTS: Record<number, string> = {
  1: 'from-amber-400/80 via-amber-600/80 to-amber-700/80',
  2: 'from-amber-300 via-amber-500 to-amber-700',
  3: 'from-yellow-300 via-amber-500 to-amber-600',
  4: 'from-yellow-400 via-amber-500 to-amber-600',
  5: 'from-yellow-300 via-amber-400 to-amber-600',
}

const MOOD_FILTERS: Record<MoodTier, string> = {
  ecstatic: 'brightness(1.15) saturate(1.2)',
  happy: 'none',
  neutral: 'saturate(0.6) brightness(0.85)',
  worried: 'saturate(0.3) brightness(0.7)',
}

const MOOD_ANIMATIONS: Record<MoodTier, string> = {
  ecstatic: 'animate-bounce',
  happy: 'animate-pulse',
  neutral: '',
  worried: '',
}

function s(base: number, size: number): number {
  return Math.round(base * (size / 96))
}

export function Pet({ mood, level, size = 'md' }: PetProps) {
  const px = SIZE_PX[size]
  const gradient = LEVEL_GRADIENTS[Math.min(level, 5)] ?? LEVEL_GRADIENTS[1]
  const filter = MOOD_FILTERS[mood]
  const animation = MOOD_ANIMATIONS[mood]

  const earSize = s(18, px)
  const innerEarSize = s(10, px)
  const eyeSize = s(9, px)
  const eyeShine = s(3, px)
  const snoutW = s(27, px)
  const snoutH = s(18, px)
  const nostrilSize = s(4, px)
  const coinSlotW = s(20, px)
  const coinSlotH = s(4, px)
  const blushW = s(15, px)
  const blushH = s(9, px)
  const mouthW = s(18, px)

  const earLeftRot = mood === 'worried' ? -25 : -15
  const earRightRot = mood === 'worried' ? 25 : 15
  const earTopOffset = mood === 'worried' ? s(2, px) : s(-4, px)

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Crown for level 4+ */}
      {level >= 4 && (
        <span className="z-10" style={{ fontSize: s(16, px), marginBottom: s(-4, px) }}>👑</span>
      )}

      {/* Main body */}
      <div
        className={`rounded-full bg-gradient-to-br ${gradient} ${animation}
          flex items-center justify-center relative
          ${level >= 5 ? 'ring-2 ring-amber-400/30' : ''}
          ${mood === 'worried' ? 'scale-95 opacity-85' : ''}
          transition-all duration-500`}
        style={{
          width: px,
          height: px,
          filter,
          boxShadow: level >= 5
            ? '0 0 40px rgba(245,158,11,0.4), 0 8px 32px rgba(217,119,6,0.3)'
            : level >= 3
              ? '0 0 24px rgba(217,119,6,0.25), 0 4px 16px rgba(217,119,6,0.2)'
              : '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {/* Ears */}
        <div className="absolute rounded-full bg-gradient-to-br from-amber-300 to-amber-500"
          style={{ width: earSize, height: earSize, top: earTopOffset, left: s(16, px), transform: `rotate(${earLeftRot}deg)` }} />
        <div className="absolute rounded-full bg-gradient-to-br from-amber-300 to-amber-500"
          style={{ width: earSize, height: earSize, top: earTopOffset, right: s(16, px), transform: `rotate(${earRightRot}deg)` }} />
        {/* Inner ears */}
        <div className="absolute rounded-full bg-amber-200"
          style={{ width: innerEarSize, height: innerEarSize, top: earTopOffset + s(3, px), left: s(20, px), transform: `rotate(${earLeftRot}deg)` }} />
        <div className="absolute rounded-full bg-amber-200"
          style={{ width: innerEarSize, height: innerEarSize, top: earTopOffset + s(3, px), right: s(20, px), transform: `rotate(${earRightRot}deg)` }} />

        {/* Coin slot */}
        <div className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: coinSlotW, height: coinSlotH, top: s(10, px),
            borderRadius: coinSlotH / 2,
            background: 'rgba(120,53,15,0.3)',
            boxShadow: mood === 'ecstatic' ? '0 0 12px rgba(251,191,36,0.8)' :
              mood === 'happy' ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
          }} />

        {/* Eyes */}
        {mood === 'ecstatic' ? (
          <>
            <div className="absolute" style={{
              width: eyeSize * 1.8, height: eyeSize, top: s(32, px), left: s(22, px),
              borderTop: `${s(3, px)}px solid #78350f`, borderRadius: '50% 50% 0 0',
            }} />
            <div className="absolute" style={{
              width: eyeSize * 1.8, height: eyeSize, top: s(32, px), right: s(22, px),
              borderTop: `${s(3, px)}px solid #78350f`, borderRadius: '50% 50% 0 0',
            }} />
          </>
        ) : mood === 'happy' ? (
          <>
            <div className="absolute" style={{
              width: eyeSize * 1.6, height: eyeSize * 0.8, top: s(34, px), left: s(24, px),
              borderBottom: `${s(3, px)}px solid #78350f`, borderRadius: '0 0 50% 50%',
            }} />
            <div className="absolute" style={{
              width: eyeSize * 1.6, height: eyeSize * 0.8, top: s(34, px), right: s(24, px),
              borderBottom: `${s(3, px)}px solid #78350f`, borderRadius: '0 0 50% 50%',
            }} />
          </>
        ) : (
          <>
            <div className="absolute rounded-full" style={{
              width: eyeSize, height: eyeSize, top: s(34, px), left: s(27, px),
              background: mood === 'worried' ? '#3a2a0a' : '#5c3a0a',
            }} />
            <div className="absolute rounded-full" style={{
              width: eyeSize, height: eyeSize, top: s(34, px), right: s(27, px),
              background: mood === 'worried' ? '#3a2a0a' : '#5c3a0a',
            }} />
            <div className="absolute rounded-full" style={{
              width: eyeShine, height: eyeShine, top: s(35, px), left: s(31, px),
              background: mood === 'worried' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
            }} />
            <div className="absolute rounded-full" style={{
              width: eyeShine, height: eyeShine, top: s(35, px), right: s(31, px),
              background: mood === 'worried' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
            }} />
          </>
        )}

        {/* Worried eyebrows */}
        {mood === 'worried' && (
          <>
            <div className="absolute" style={{
              width: s(11, px), top: s(27, px), left: s(24, px),
              borderBottom: `${s(2, px)}px solid #3a2a0a`, transform: 'rotate(-12deg)',
            }} />
            <div className="absolute" style={{
              width: s(11, px), top: s(27, px), right: s(24, px),
              borderBottom: `${s(2, px)}px solid #3a2a0a`, transform: 'rotate(12deg)',
            }} />
          </>
        )}

        {/* Snout */}
        <div className="absolute rounded-full left-1/2 -translate-x-1/2 flex items-center justify-center"
          style={{
            width: snoutW, height: snoutH, top: s(44, px),
            background: level >= 3 ? '#fde68a' : '#fcd34d',
            gap: s(4, px),
          }}>
          <div className="rounded-full" style={{ width: nostrilSize, height: nostrilSize, background: '#92400e' }} />
          <div className="rounded-full" style={{ width: nostrilSize, height: nostrilSize, background: '#92400e' }} />
        </div>

        {/* Mouth — level 2+ only */}
        {level >= 2 && (
          mood === 'ecstatic' ? (
            <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{
                width: s(20, px), height: s(10, px), top: s(60, px),
                background: '#78350f', borderRadius: `0 0 ${s(10, px)}px ${s(10, px)}px`,
              }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                style={{ width: s(10, px), height: s(4, px), background: '#ef4444' }} />
            </div>
          ) : mood === 'happy' ? (
            <div className="absolute left-1/2 -translate-x-1/2"
              style={{
                width: mouthW, height: s(8, px), top: s(60, px),
                borderBottom: `${s(2, px)}px solid #78350f`,
                borderRadius: '0 0 50% 50%',
              }} />
          ) : mood === 'worried' ? (
            <div className="absolute left-1/2 -translate-x-1/2"
              style={{
                width: s(14, px), height: s(5, px), top: s(62, px),
                borderTop: `${s(2, px)}px solid #3a2a0a`,
                borderRadius: '50% 50% 0 0',
              }} />
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2"
              style={{
                width: s(12, px), top: s(62, px),
                borderBottom: `${s(2, px)}px solid #5c3a0a`,
              }} />
          )
        )}

        {/* Blush marks — level 3+ and not worried */}
        {level >= 3 && mood !== 'worried' && (
          <>
            <div className="absolute rounded-full"
              style={{
                width: blushW, height: blushH, top: s(42, px), left: s(6, px),
                background: mood === 'ecstatic' ? 'rgba(251,146,60,0.6)' : 'rgba(251,146,60,0.45)',
              }} />
            <div className="absolute rounded-full"
              style={{
                width: blushW, height: blushH, top: s(42, px), right: s(6, px),
                background: mood === 'ecstatic' ? 'rgba(251,146,60,0.6)' : 'rgba(251,146,60,0.45)',
              }} />
          </>
        )}

        {/* Inner metallic ring — level 3+ */}
        {level >= 3 && (
          <div className="absolute rounded-full"
            style={{
              inset: s(3, px),
              border: `1px solid rgba(255,255,255,${level >= 5 ? '0.25' : '0.12'})`,
            }} />
        )}

        {/* Worried sweat drop */}
        {mood === 'worried' && (
          <div className="absolute"
            style={{
              width: s(6, px), height: s(9, px), top: s(20, px), right: s(12, px),
              background: 'linear-gradient(180deg, transparent, rgba(147,197,253,0.6))',
              borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%',
            }} />
        )}
      </div>

      {/* Sparkle trail for level 5 */}
      {level >= 5 && (
        <div className="absolute -top-1 -right-1 animate-ping">
          <span style={{ fontSize: s(12, px) }}>✨</span>
        </div>
      )}

      {/* Ecstatic sparkles */}
      {mood === 'ecstatic' && (
        <>
          <div className="absolute animate-pulse" style={{ top: s(-6, px), left: s(6, px), fontSize: s(12, px) }}>✨</div>
          <div className="absolute animate-pulse" style={{ top: s(4, px), right: s(2, px), fontSize: s(9, px), animationDelay: '0.5s' }}>⭐</div>
        </>
      )}
    </div>
  )
}
