// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'

const EMOJI_OPTIONS = [
  '🎧', '🎮', '📱', '👟', '⚽', '🎨', '📚', '🎁', '🧸', '🍦',
  '🎠', '✈️', '💻', '🎸', '🐶', '🏠', '💍', '⌚', '🎪', '🎯',
]

interface SavingsGoalFormProps {
  onSubmit: (name: string, emoji: string, targetAmount: number) => void
  onCancel: () => void
}

export function SavingsGoalForm({ onSubmit, onCancel }: SavingsGoalFormProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [amountStr, setAmountStr] = useState('')

  const parsedAmount = parseFloat(amountStr)
  const isValid = name.trim() !== '' && emoji !== '' && !isNaN(parsedAmount) && parsedAmount > 0

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit(name.trim(), emoji, parsedAmount)
  }

  return (
    <div className="space-y-4">
      {/* Name input */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Nimi</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nt. Kõrvaklapid"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Emoji picker */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Ikoon</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                emoji === e
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Target amount */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Summa (€)</label>
        <input
          type="text"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value.replace(',', '.'))}
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Tühista
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40 transition-colors"
        >
          Lisa eesmärk
        </button>
      </div>
    </div>
  )
}
