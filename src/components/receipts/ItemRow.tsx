// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { Users, Plus, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Participant } from '@/types/participant'

interface ItemRowProps {
  index: number
  item: {
    id: string
    name: string
    nameOriginal?: string
    price: string
    qty: number
  }
  /** participantId -> count */
  counts: Map<string, number>
  participants: Participant[]
  shortNames: Map<string, string>
  onNameChange: (name: string) => void
  onPriceChange: (price: string) => void
  /** delta is +1 or -1 (or any integer); the parent clamps to [0, qty]. */
  onCountChange: (participantId: string, delta: number) => void
  onAssignEvenly: () => void
}

const CHIP_COLORS = [
  { on: 'bg-blue-500 text-white',    off: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700' },
  { on: 'bg-emerald-500 text-white', off: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' },
  { on: 'bg-violet-500 text-white',  off: 'bg-violet-100 text-violet-700 border border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700' },
  { on: 'bg-amber-500 text-white',   off: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700' },
  { on: 'bg-rose-500 text-white',    off: 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700' },
  { on: 'bg-cyan-500 text-white',    off: 'bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700' },
  { on: 'bg-fuchsia-500 text-white', off: 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-700' },
  { on: 'bg-teal-500 text-white',    off: 'bg-teal-100 text-teal-700 border border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700' },
]

function getChipColor(index: number, on: boolean): string {
  if (!on) return 'bg-muted text-muted-foreground border border-border'
  return CHIP_COLORS[index % CHIP_COLORS.length].on
}

export function ItemRow({
  index,
  item,
  counts,
  participants,
  shortNames,
  onNameChange,
  onPriceChange,
  onCountChange,
  onAssignEvenly,
}: ItemRowProps) {
  const { t } = useTranslation()
  const assigned = Array.from(counts.values()).reduce((a, b) => a + b, 0)
  const fullyAssigned = assigned >= item.qty
  const showProgress = assigned > 0
  const showOriginal = !!item.nameOriginal && item.nameOriginal !== item.name
  const isSingleQty = item.qty === 1

  return (
    <div className={`border border-border rounded-lg p-3 space-y-2 ${index % 2 !== 0 ? 'bg-muted/25' : ''}`}>
      <div className="flex gap-2 items-center">
        <div className="flex-1 space-y-0.5">
          <Input
            value={item.name}
            onChange={e => onNameChange(e.target.value)}
            placeholder={t('receipt.itemNamePlaceholder', { defaultValue: 'Item name' })}
            className="h-8 text-sm"
            style={{ fontSize: '1rem' }}
          />
          {showOriginal && (
            <div className="text-xs italic text-muted-foreground pl-1">{item.nameOriginal}</div>
          )}
        </div>
        {item.qty > 1 && (
          <div className="shrink-0 text-xs text-muted-foreground border border-border rounded px-1.5 py-1">
            x{item.qty}
          </div>
        )}
        <Input
          inputMode="decimal"
          value={item.price}
          onChange={e => onPriceChange(e.target.value.replace(',', '.'))}
          placeholder="0.00"
          className="w-24 h-8 text-sm text-right"
          style={{ fontSize: '1rem' }}
        />
      </div>

      {showProgress && (
        <div className={`text-xs font-medium ${fullyAssigned ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {`${assigned} of ${item.qty} assigned`}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        {participants.map((p, pi) => {
          const count = counts.get(p.id) ?? 0
          const on = count > 0
          if (isSingleQty) {
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onCountChange(p.id, on ? -1 : 1)}
                className={[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
                  getChipColor(pi, on),
                ].join(' ')}
                title={p.name}
              >
                {shortNames.get(p.id) || p.name}
              </button>
            )
          }
          return (
            <div key={p.id} className={[
              'inline-flex items-center gap-1 rounded-full text-xs font-medium pr-1.5 pl-2 py-0.5',
              getChipColor(pi, on),
            ].join(' ')}>
              <span>{shortNames.get(p.id) || p.name}</span>
              <button
                type="button"
                aria-label={`Decrement ${p.name}`}
                onClick={() => onCountChange(p.id, -1)}
                disabled={count === 0}
                className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded-full bg-white/20 disabled:opacity-30 hover:bg-white/30"
              >
                <Minus size={10} />
              </button>
              <span className="min-w-[1ch] text-center tabular-nums">{count}</span>
              <button
                type="button"
                aria-label={`Increment ${p.name}`}
                onClick={() => onCountChange(p.id, 1)}
                disabled={fullyAssigned}
                className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-white/20 disabled:opacity-30 hover:bg-white/30"
              >
                <Plus size={10} />
              </button>
            </div>
          )
        })}

        {participants.length > 1 && (
          <button
            type="button"
            onClick={onAssignEvenly}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-border bg-muted text-muted-foreground hover:bg-accent"
          >
            <Users size={10} />
            Everyone equally
          </button>
        )}
      </div>
    </div>
  )
}
