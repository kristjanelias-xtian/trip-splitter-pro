// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { usePet } from '../hooks/usePet'
import { Pet } from './Pet'

export function NamePetSheet() {
  const { pet, isNamed, namePet, mood } = usePet()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!pet || isNamed) return null

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await namePet(trimmed)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={true}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '75dvh' }}
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div className="shrink-0 flex items-center justify-center px-4 py-3 border-b border-border">
          <SheetTitle>Anna oma lemmikule nimi!</SheetTitle>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
          <Pet mood={mood.tier} level={1} size="lg" />

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Lemmiku nimi..."
            maxLength={20}
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-border bg-background text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="w-full max-w-xs py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Salvestan...' : 'Vali nimi'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
