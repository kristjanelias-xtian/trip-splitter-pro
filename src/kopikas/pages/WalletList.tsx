// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useKopikasAuth } from '../app/KopikasAuthProvider'
import { useKopikasBasePath } from '../hooks/useKopikasBasePath'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import type { Wallet } from '../types'
import { Loader2, Plus } from 'lucide-react'

export function WalletList() {
  const { user, loading: authLoading } = useKopikasAuth()
  const basePath = useKopikasBasePath()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    const fetchWallets = async () => {
      try {
        const { data: members } = await withTimeout(
          (supabase.from('wallet_members' as any) as any)
            .select('wallet_id')
            .eq('user_id', user.id),
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
  }, [user?.id, authLoading])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <img src="/kopikas-logo.png" alt="Kopikas" className="h-7" />
          {user && (
            <Link
              to={`${basePath}/create`}
              className="rounded-full w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground"
              aria-label="Loo uus"
            >
              <Plus className="w-4 h-4" />
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {authLoading || loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-4">🫧</span>
            <p className="text-muted-foreground mb-2">Logi sisse, et näha oma rahakotte</p>
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-4xl block mb-4">🫧</span>
            <p className="text-lg font-medium mb-2">Sul pole veel rahakotte</p>
            <p className="text-sm text-muted-foreground mb-6">Loo oma lapsele taskuraha rahakott</p>
            <Link
              to={`${basePath}/create`}
              className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Loo rahakott
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map(w => (
              <div key={w.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4">
                  <p className="font-medium text-lg">{w.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Kopikas rahakott</p>
                </div>
                <div className="flex border-t border-border divide-x divide-border">
                  <Link
                    to={`${basePath}/${w.wallet_code}`}
                    className="flex-1 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
                  >
                    Lapse vaade
                  </Link>
                  <Link
                    to={`${basePath}/${w.wallet_code}/parent`}
                    className="flex-1 py-2.5 text-center text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
                  >
                    Vanema vaade
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
