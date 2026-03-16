// SPDX-License-Identifier: Apache-2.0
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { KopikasRouteGuard } from './KopikasRouteGuard'
import { KopikasAuthBridge } from './KopikasAuthBridge'
import { PetProvider } from '../contexts/PetContext'
import { KopikasTabBar } from './KopikasTabBar'
import { NamePetSheet } from './NamePetSheet'
import { useWallet } from '../hooks/useWallet'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function KopikasInner() {
  const { wallet, transactions } = useWallet()

  useEffect(() => {
    document.title = 'Kopikas'
  }, [])

  return (
    <PetProvider walletId={wallet?.id ?? null} transactions={transactions}>
      <div className="min-h-screen bg-background text-foreground">
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
