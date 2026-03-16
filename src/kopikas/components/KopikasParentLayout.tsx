// SPDX-License-Identifier: Apache-2.0
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { KopikasRouteGuard } from './KopikasRouteGuard'
import { KopikasAuthBridge } from './KopikasAuthBridge'
import { PetProvider } from '../contexts/PetContext'
import { useWallet } from '../hooks/useWallet'
import { useKopikasBasePath } from '../hooks/useKopikasBasePath'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ArrowLeft } from 'lucide-react'

function ParentInner() {
  const { wallet, transactions } = useWallet()
  const navigate = useNavigate()
  const basePath = useKopikasBasePath()

  useEffect(() => {
    document.title = 'Kopikas'
  }, [])

  return (
    <PetProvider walletId={wallet?.id ?? null} transactions={transactions}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => navigate(basePath || '/')}
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Tagasi"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-lg">Kopikas</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
    </PetProvider>
  )
}

export function KopikasParentLayout() {
  return (
    <ErrorBoundary>
      <KopikasRouteGuard>
        <KopikasAuthBridge>
          <ParentInner />
        </KopikasAuthBridge>
      </KopikasRouteGuard>
    </ErrorBoundary>
  )
}
