// SPDX-License-Identifier: Apache-2.0
import type { MoodTier } from '../types'

interface PetProps {
  mood: MoodTier
  level: number
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_PX = { sm: 64, md: 96, lg: 128 } as const

// Dramatically different palettes per level
const LEVEL_PALETTES = {
  1: { body: ['#c8a97e', '#a0845c', '#806a42'], ear: ['#b89968', '#9a7d4e'], innerEar: '#c8a97e', snout: '#d4b88a', nostril: '#6b5530' },
  2: { body: ['#e8b84a', '#c89530', '#a67a20'], ear: ['#daa83a', '#c09028'], innerEar: '#ecc462', snout: '#ecc462', nostril: '#7a5c18' },
  3: { body: ['#fcd34d', '#f59e0b', '#d97706'], ear: ['#fbbf24', '#e8a00c'], innerEar: '#fde68a', snout: '#fde68a', nostril: '#92400e' },
  4: { body: ['#fde047', '#fbbf24', '#d97706'], ear: ['#fcd34d', '#f59e0b'], innerEar: '#fef08a', snout: '#fef08a', nostril: '#92400e' },
  5: { body: ['#fef08a', '#fbbf24', '#e8a00c'], ear: ['#fde68a', '#fbbf24'], innerEar: '#fef9c3', snout: '#fef9c3', nostril: '#92400e' },
} as const

const MOOD_FILTERS: Record<MoodTier, string> = {
  ecstatic: 'brightness(1.15) saturate(1.2)',
  happy: 'none',
  neutral: 'saturate(0.7) brightness(0.9)',
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
  const lvl = Math.min(Math.max(level, 1), 5) as 1 | 2 | 3 | 4 | 5
  const palette = LEVEL_PALETTES[lvl]
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

  // Eye color darkens with level
  const eyeColor = lvl <= 2 ? '#5c4a2a' : '#78350f'

  return (
    <div className={`relative inline-flex flex-col items-center ${animation}`}>
      {/* Crown for level 4+ */}
      {level >= 4 && (
        <span className="z-10" style={{ fontSize: s(16, px), marginBottom: s(-4, px) }}>👑</span>
      )}

      {/* Main body */}
      <div
        className={`rounded-full
          flex items-center justify-center relative
          ${level >= 5 ? 'ring-2 ring-amber-400/30' : ''}
          ${mood === 'worried' ? 'scale-95 opacity-85' : ''}
          transition-all duration-500`}
        style={{
          width: px,
          height: px,
          background: `linear-gradient(135deg, ${palette.body[0]}, ${palette.body[1]}, ${palette.body[2]})`,
          filter,
          boxShadow: level >= 5
            ? `0 0 ${s(40, px)}px rgba(251,191,36,0.5), 0 ${s(8, px)}px ${s(32, px)}px rgba(217,119,6,0.4)`
            : level >= 4
              ? `0 0 ${s(28, px)}px rgba(245,158,11,0.35), 0 ${s(6, px)}px ${s(20, px)}px rgba(217,119,6,0.3)`
              : level >= 3
                ? `0 0 ${s(18, px)}px rgba(217,119,6,0.25), 0 ${s(4, px)}px ${s(14, px)}px rgba(217,119,6,0.2)`
                : level >= 2
                  ? `0 ${s(4, px)}px ${s(12, px)}px rgba(180,130,30,0.2)`
                  : `0 ${s(2, px)}px ${s(8, px)}px rgba(0,0,0,0.15)`,
        }}
      >
        {/* Ears */}
        <div className="absolute rounded-full"
          style={{ width: earSize, height: earSize, top: earTopOffset, left: s(16, px), transform: `rotate(${earLeftRot}deg)`, background: `linear-gradient(135deg, ${palette.ear[0]}, ${palette.ear[1]})` }} />
        <div className="absolute rounded-full"
          style={{ width: earSize, height: earSize, top: earTopOffset, right: s(16, px), transform: `rotate(${earRightRot}deg)`, background: `linear-gradient(135deg, ${palette.ear[0]}, ${palette.ear[1]})` }} />
        {/* Inner ears */}
        <div className="absolute rounded-full"
          style={{ width: innerEarSize, height: innerEarSize, top: earTopOffset + s(3, px), left: s(20, px), transform: `rotate(${earLeftRot}deg)`, background: palette.innerEar }} />
        <div className="absolute rounded-full"
          style={{ width: innerEarSize, height: innerEarSize, top: earTopOffset + s(3, px), right: s(20, px), transform: `rotate(${earRightRot}deg)`, background: palette.innerEar }} />

        {/* Coin slot */}
        <div className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: coinSlotW, height: coinSlotH, top: s(10, px),
            borderRadius: coinSlotH / 2,
            background: lvl <= 2 ? 'rgba(80,60,20,0.25)' : 'rgba(120,53,15,0.3)',
            boxShadow: level >= 4 && mood === 'ecstatic' ? '0 0 12px rgba(251,191,36,0.8)' :
              level >= 3 && mood === 'happy' ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
          }} />

        {/* Eyes */}
        {mood === 'ecstatic' ? (
          <>
            <div className="absolute" style={{
              width: eyeSize * 1.8, height: eyeSize, top: s(32, px), left: s(22, px),
              borderTop: `${s(3, px)}px solid ${eyeColor}`, borderRadius: '50% 50% 0 0',
            }} />
            <div className="absolute" style={{
              width: eyeSize * 1.8, height: eyeSize, top: s(32, px), right: s(22, px),
              borderTop: `${s(3, px)}px solid ${eyeColor}`, borderRadius: '50% 50% 0 0',
            }} />
          </>
        ) : mood === 'happy' ? (
          <>
            <div className="absolute" style={{
              width: eyeSize * 1.6, height: eyeSize * 0.8, top: s(34, px), left: s(24, px),
              borderBottom: `${s(3, px)}px solid ${eyeColor}`, borderRadius: '0 0 50% 50%',
            }} />
            <div className="absolute" style={{
              width: eyeSize * 1.6, height: eyeSize * 0.8, top: s(34, px), right: s(24, px),
              borderBottom: `${s(3, px)}px solid ${eyeColor}`, borderRadius: '0 0 50% 50%',
            }} />
          </>
        ) : (
          <>
            <div className="absolute rounded-full" style={{
              width: eyeSize, height: eyeSize, top: s(34, px), left: s(27, px),
              background: mood === 'worried' ? '#3a2a0a' : eyeColor,
            }} />
            <div className="absolute rounded-full" style={{
              width: eyeSize, height: eyeSize, top: s(34, px), right: s(27, px),
              background: mood === 'worried' ? '#3a2a0a' : eyeColor,
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
            background: palette.snout,
            gap: s(4, px),
          }}>
          <div className="rounded-full" style={{ width: nostrilSize, height: nostrilSize, background: palette.nostril }} />
          <div className="rounded-full" style={{ width: nostrilSize, height: nostrilSize, background: palette.nostril }} />
        </div>

        {/* Mouth — level 2+ only */}
        {level >= 2 && (
          mood === 'ecstatic' ? (
            <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
              style={{
                width: s(20, px), height: s(10, px), top: s(60, px),
                background: eyeColor, borderRadius: `0 0 ${s(10, px)}px ${s(10, px)}px`,
              }}>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                style={{ width: s(10, px), height: s(4, px), background: '#ef4444' }} />
            </div>
          ) : mood === 'happy' ? (
            <div className="absolute left-1/2 -translate-x-1/2"
              style={{
                width: mouthW, height: s(8, px), top: s(60, px),
                borderBottom: `${s(2, px)}px solid ${eyeColor}`,
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
                borderBottom: `${s(2, px)}px solid ${eyeColor}`,
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
              border: `1px solid rgba(255,255,255,${level >= 5 ? '0.3' : level >= 4 ? '0.2' : '0.12'})`,
            }} />
        )}

        {/* Specular highlight — level 4+ (top-left shine) */}
        {level >= 4 && (
          <div className="absolute rounded-full"
            style={{
              width: s(14, px), height: s(8, px), top: s(16, px), left: s(18, px),
              background: 'rgba(255,255,255,0.2)',
              transform: 'rotate(-30deg)',
              borderRadius: '50%',
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
        <>
          <div className="absolute -top-1 -right-1 animate-ping">
            <span style={{ fontSize: s(12, px) }}>✨</span>
          </div>
          <div className="absolute animate-pulse" style={{ bottom: s(4, px), left: s(-4, px), fontSize: s(10, px), animationDelay: '0.7s' }}>✨</div>
        </>
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
