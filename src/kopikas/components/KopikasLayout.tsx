// SPDX-License-Identifier: Apache-2.0
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { KopikasRouteGuard } from './KopikasRouteGuard'
import { KopikasAuthBridge } from './KopikasAuthBridge'
import { PetProvider } from '../contexts/PetContext'
import { KopikasTabBar } from './KopikasTabBar'
import { NamePetSheet } from './NamePetSheet'
import { useWallet } from '../hooks/useWallet'
import { useKopikasBasePath } from '../hooks/useKopikasBasePath'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ArrowLeft } from 'lucide-react'

function KopikasInner() {
  const { wallet, transactions } = useWallet()
  const navigate = useNavigate()
  const basePath = useKopikasBasePath()

  useEffect(() => {
    document.title = 'Kopikas'
  }, [])

  return (
    <PetProvider walletId={wallet?.id ?? null} transactions={transactions}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur pwa-safe-top">
          <div className="max-w-lg mx-auto px-4 h-10 flex items-center">
            <button
              onClick={() => navigate(basePath || '/')}
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors -ml-1"
              aria-label="Tagasi"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>
        <main className="pb-16">
          <Outlet />
        </main>
        <KopikasTabBar />
        <NamePetSheet />
      </div>
    </PetProvider>
  )
}

export function KopikasLayout() {
  return (
    <ErrorBoundary>
      <KopikasRouteGuard>
        <KopikasAuthBridge>
          <KopikasInner />
        </KopikasAuthBridge>
      </KopikasRouteGuard>
    </ErrorBoundary>
  )
}
