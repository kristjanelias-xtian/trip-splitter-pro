// SPDX-License-Identifier: Apache-2.0
import { useKopikasAuth } from './KopikasAuthProvider'
import { Navigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { logger } from '@/lib/logger'
import { Loader2 } from 'lucide-react'

export function KopikasLoginPage() {
  const { user, loading, signInWithGoogle } = useKopikasAuth()

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

      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) {
            signInWithGoogle(response.credential)
          }
        }}
        onError={() => {
          logger.error('Google Sign-In failed')
        }}
        size="large"
        theme="outline"
        text="signin_with"
      />
    </div>
  )
}
