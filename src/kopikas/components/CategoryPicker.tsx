// SPDX-License-Identifier: Apache-2.0
import type { KopikasCategory } from '../types'
import { KOPIKAS_CATEGORIES } from '../lib/kopikasCategories'

interface CategoryPickerProps {
  selected: KopikasCategory | null
  onSelect: (category: KopikasCategory) => void
}

export function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KOPIKAS_CATEGORIES.map(cat => (
        <button
          key={cat.key}
          type="button"
          onClick={() => onSelect(cat.key)}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors
            ${selected === cat.key
              ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
              : 'border-border hover:bg-muted'
            }`}
        >
          <span className="text-2xl">{cat.emoji}</span>
          <span className="text-xs text-muted-foreground">{cat.label}</span>
        </button>
      ))}
    </div>
  )
}
