// SPDX-License-Identifier: Apache-2.0
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { KopikasRouteGuard } from './KopikasRouteGuard'
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

  useEffect(() => {
    // Default to dark mode for Kopikas (optimized for pet visuals)
    if (!localStorage.getItem('spl1t:theme')) {
      localStorage.setItem('spl1t:theme', 'dark')
      document.documentElement.classList.add('dark')
    }
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
        <KopikasInner />
      </KopikasRouteGuard>
    </ErrorBoundary>
  )
}
