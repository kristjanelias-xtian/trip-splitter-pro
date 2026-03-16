// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import type { Wallet } from '../types'

interface KopikasHomeSectionProps {
  userId: string
}

export function KopikasHomeSection({ userId }: KopikasHomeSectionProps) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        // Fetch wallet_members for this user, then fetch the wallets
        const { data: members } = await withTimeout(
          (supabase.from('wallet_members' as any) as any)
            .select('wallet_id')
            .eq('user_id', userId),
          15000,
          'Loading wallets timed out'
        ) as { data: any[] | null }

        if (!members || members.length === 0) {
          setWallets([])
          return
        }

        const walletIds = members.map((m: any) => m.wallet_id)
        const { data: walletData } = await withTimeout(
          (supabase.from('wallets' as any) as any)
            .select('*')
            .in('id', walletIds)
            .order('created_at', { ascending: false }),
          15000,
          'Loading wallet details timed out'
        ) as { data: any[] | null }

        setWallets((walletData as Wallet[]) || [])
      } catch (error) {
        logger.error('Failed to fetch wallets', { error: error instanceof Error ? error.message : String(error) })
      } finally {
        setLoading(false)
      }
    }
    fetchWallets()
  }, [userId])

  if (loading) return null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Kopikas</h2>
        <Link to="/kopikas/create" className="text-sm text-primary hover:underline">
          Loo uus
        </Link>
      </div>
      {wallets.length === 0 ? (
        <Link
          to="/kopikas/create"
          className="block p-6 rounded-xl border border-dashed border-border hover:bg-muted/50 transition-colors text-center"
        >
          <span className="text-2xl block mb-2">🫧</span>
          <p className="text-sm text-muted-foreground">Loo oma lapsele taskuraha rahakott</p>
        </Link>
      ) : (
        <div className="space-y-2">
          {wallets.map(w => (
            <Link
              key={w.id}
              to={`/kopikas/${w.wallet_code}/parent`}
              className="block p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <p className="font-medium">{w.name}</p>
              <p className="text-sm text-muted-foreground">Kopikas rahakott</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
