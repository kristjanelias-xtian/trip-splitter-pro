// SPDX-License-Identifier: Apache-2.0
import { useContext, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { KopikasAuthContext } from '../app/KopikasAuthProvider'

export function KopikasAuthBridge({ children }: { children: ReactNode }) {
  // If KopikasAuthContext is already provided (standalone mode), skip bridging
  const existing = useContext(KopikasAuthContext)
  if (existing) return <>{children}</>

  // Bridge Spl1t auth into Kopikas auth context
  return <KopikasAuthBridgeInner>{children}</KopikasAuthBridgeInner>
}

function KopikasAuthBridgeInner({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const value = {
    user,
    loading,
    signInWithGoogle: async () => {},
    signOut: async () => {},
  }
  return (
    <KopikasAuthContext.Provider value={value}>
      {children}
    </KopikasAuthContext.Provider>
  )
}
