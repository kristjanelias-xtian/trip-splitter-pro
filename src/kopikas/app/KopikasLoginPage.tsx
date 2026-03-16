// SPDX-License-Identifier: Apache-2.0
import { useKopikasAuth } from './KopikasAuthProvider'
import { Navigate } from 'react-router-dom'
import { KopikasSignInButton } from '../components/KopikasSignInButton'
import { Loader2 } from 'lucide-react'

export function KopikasLoginPage() {
  const { user, loading } = useKopikasAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center mb-8">
        <img src="/kopikas-logo.png" alt="Kopikas" className="h-12 mb-3" />
        <p className="text-muted-foreground">Lapse taskuraha, mänguliselt</p>
      </div>

      <KopikasSignInButton />
    </div>
  )
}
