// SPDX-License-Identifier: Apache-2.0
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useKopikasAuth } from './KopikasAuthProvider'
import { KopikasLandingPage } from './KopikasLandingPage'
import { KopikasLoginPage } from './KopikasLoginPage'
import { KopikasLayout } from '../components/KopikasLayout'
import { KopikasParentLayout } from '../components/KopikasParentLayout'
import { KopikasHome } from '../pages/KopikasHome'
import { Analytics } from '../pages/Analytics'
import { PetDetail } from '../pages/PetDetail'
import { History } from '../pages/History'
import { ParentView } from '../pages/ParentView'
import { CreateWallet } from '../pages/CreateWallet'
import { WalletList } from '../pages/WalletList'
import { Loader2 } from 'lucide-react'

function KopikasHomePage() {
  const { user, loading } = useKopikasAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  return user ? <WalletList /> : <KopikasLandingPage />
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useKopikasAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function KopikasAppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ErrorBoundary><KopikasHomePage /></ErrorBoundary>} />

      {/* Static routes — BEFORE :walletCode wildcard */}
      <Route path="/login" element={<ErrorBoundary><KopikasLoginPage /></ErrorBoundary>} />
      <Route path="/create" element={<ErrorBoundary><AuthGate><CreateWallet /></AuthGate></ErrorBoundary>} />

      {/* Kid routes (unauthenticated) */}
      <Route path="/:walletCode" element={<KopikasLayout />}>
        <Route index element={<ErrorBoundary><KopikasHome /></ErrorBoundary>} />
        <Route path="analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
        <Route path="pet" element={<ErrorBoundary><PetDetail /></ErrorBoundary>} />
        <Route path="history" element={<ErrorBoundary><History /></ErrorBoundary>} />
      </Route>

      {/* Parent route (auth-gated) */}
      <Route path="/:walletCode/parent" element={<AuthGate><KopikasParentLayout /></AuthGate>}>
        <Route index element={<ErrorBoundary><ParentView /></ErrorBoundary>} />
      </Route>
    </Routes>
  )
}
