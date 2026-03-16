// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { KopikasAuthContext } from '../app/KopikasAuthProvider'

export function KopikasAuthBridge({ children }: { children: ReactNode }) {
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
