// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { generateTripCode } from '@/lib/tripCodeGenerator'
import { logger } from '@/lib/logger'
import { STARTER_EMOJIS } from '../types'
import { ArrowLeft } from 'lucide-react'

export function CreateWallet() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [kidName, setKidName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-muted-foreground text-center">Logi sisse, et luua rahakott</p>
      </div>
    )
  }

  const handleCreate = async () => {
    const trimmed = kidName.trim()
    if (!trimmed) return

    setCreating(true)
    setError(null)

    try {
      const walletCode = generateTripCode(trimmed)
      const randomEmoji = STARTER_EMOJIS[Math.floor(Math.random() * STARTER_EMOJIS.length)]

      // Create wallet
      const { data: wallet, error: walletError } = await withTimeout(
        (supabase.from('wallets' as any) as any)
          .insert({ wallet_code: walletCode, name: trimmed, currency: 'EUR', created_by: user.id })
          .select()
          .single(),
        15000,
        'Rahakoti loomine aegus'
      ) as { data: any; error: any }

      if (walletError) throw walletError

      // Add creator as parent member
      await withTimeout(
        (supabase.from('wallet_members' as any) as any)
          .insert({ wallet_id: wallet.id, user_id: user.id, role: 'parent' }),
        15000,
        'Liikme lisamine aegus'
      )

      // Create pet
      await withTimeout(
        (supabase.from('wallet_pets' as any) as any)
          .insert({ wallet_id: wallet.id, starter_emoji: randomEmoji }),
        15000,
        'Lemmiku loomine aegus'
      )

      navigate(`/kopikas/${walletCode}/parent`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Rahakoti loomine ebaõnnestus'
      setError(msg)
      logger.error('Failed to create wallet', { error: msg })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Loo Kopikas rahakott</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Lapse nimi</label>
          <input type="text" value={kidName} onChange={e => setKidName(e.target.value)}
            placeholder="Nt. Mari"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button onClick={handleCreate} disabled={creating || !kidName.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 transition-opacity">
          {creating ? 'Loon...' : 'Loo rahakott'}
        </button>
      </main>
    </div>
  )
}
