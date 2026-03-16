// SPDX-License-Identifier: Apache-2.0
import { useMemo } from 'react'
import { usePet } from '../hooks/usePet'
import { useWallet } from '../hooks/useWallet'
import { Pet } from '../components/Pet'
import { PetSpeechBubble } from '../components/PetSpeechBubble'
import { getXpProgress } from '../lib/xpCalculator'
import { PET_LEVELS } from '../types'

export function PetDetail() {
  const { pet, mood } = usePet()
  const { transactions } = useWallet()

  const xpProgress = useMemo(() => {
    if (!pet) return { current: 0, needed: 0, percent: 0 }
    return getXpProgress(pet.xp)
  }, [pet?.xp])

  // Compute achievements from transaction history
  const achievements = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense')
    if (expenses.length === 0) return []

    const result: { emoji: string; label: string; count: number }[] = []

    // Total expenses logged
    result.push({ emoji: '📝', label: 'Kirjeid', count: expenses.length })

    // Unique categories used
    const categories = new Set(expenses.map(t => t.category).filter(Boolean))
    result.push({ emoji: '🎨', label: 'Kategooriaid', count: categories.size })

    // Days with entries
    const days = new Set(expenses.map(t => new Date(t.created_at).toISOString().slice(0, 10)))
    result.push({ emoji: '📅', label: 'Aktiivsed päevad', count: days.size })

    return result
  }, [transactions])

  if (!pet) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Large pet */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <PetSpeechBubble mood={mood} />
        <Pet mood={mood.tier} level={pet.level} starterEmoji={pet.starter_emoji} size="lg" />
        <div className="text-center">
          <h1 className="text-xl font-bold">{pet.name}</h1>
          <p className="text-sm text-muted-foreground">Tase {pet.level}</p>
        </div>
      </div>

      {/* XP Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">XP</span>
          <span className="tabular-nums">
            {xpProgress.needed > 0
              ? `${xpProgress.current} / ${xpProgress.needed}`
              : 'MAX'}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${xpProgress.percent}%` }}
          />
        </div>
      </div>

      {/* Level description */}
      <div className="mb-8 p-4 rounded-xl border border-border bg-card">
        <p className="text-sm text-muted-foreground mb-1">Tase {pet.level}</p>
        <p className="text-sm">{PET_LEVELS.find(l => l.level === pet.level)?.description}</p>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold mb-3">Saavutused</h2>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map(a => (
              <div key={a.label} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border">
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-lg font-bold">{a.count}</span>
                <span className="text-xs text-muted-foreground text-center">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolution history */}
      <div>
        <h2 className="font-semibold mb-3">Evolutsioon</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {PET_LEVELS.filter(l => l.level <= pet.level).map(l => (
            <div key={l.level} className="flex flex-col items-center gap-1 shrink-0">
              <Pet
                mood={l.level === pet.level ? mood.tier : 'happy'}
                level={l.level}
                starterEmoji={pet.starter_emoji}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">Tase {l.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
