// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export interface KopikasAuthContextValue {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const KopikasAuthContext = createContext<KopikasAuthContextValue | undefined>(undefined)

export function KopikasAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // NEVER await DB queries in this callback — deadlock risk (see CLAUDE.md)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      logger.error('Google sign-in failed', { error: error.message })
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('Sign-out failed', { error: error.message })
    }
  }

  return (
    <KopikasAuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </KopikasAuthContext.Provider>
  )
}

export function useKopikasAuth() {
  const ctx = useContext(KopikasAuthContext)
  if (!ctx) throw new Error('useKopikasAuth must be used within KopikasAuthProvider')
  return ctx
}
