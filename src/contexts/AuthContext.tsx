import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/auth'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: (credential: string) => Promise<void>
  signOut: () => Promise<void>
  updateBankDetails: (holder: string, iban: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Upsert user profile from auth metadata
  const upsertProfile = async (authUser: User) => {
    const metadata = authUser.user_metadata
    const profile: Omit<UserProfile, 'created_at' | 'updated_at' | 'bank_account_holder' | 'bank_iban'> = {
      id: authUser.id,
      display_name: metadata?.full_name || metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email || null,
      avatar_url: metadata?.avatar_url || metadata?.picture || null,
    }

    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .upsert(profile, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      logger.error('Failed to upsert user profile', { error: error.message })
      // Return a local profile if DB fails (e.g., table doesn't exist yet)
      return {
        ...profile,
        bank_account_holder: null,
        bank_iban: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as UserProfile
    }

    return data as UserProfile
  }

  // Fetch existing profile
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      return null
    }

    return data as UserProfile
  }

  useEffect(() => {
    let initialSessionHandled = false

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      initialSessionHandled = true
      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        try {
          const profile = await withTimeout(
            (async () => {
              const p = await fetchProfile(initialSession.user!.id)
              return p || upsertProfile(initialSession.user!)
            })(),
            8000,
            'Profile load timed out'
          )
          setUserProfile(profile)
        } catch (profileErr) {
          // Profile failed or timed out — app still loads, profile retries on next auth event
          logger.warn('Auth profile init failed, proceeding without profile', {
            error: profileErr instanceof Error ? profileErr.message : String(profileErr),
          })
        }
      }

      setLoading(false)
    }).catch((err) => {
      logger.error('Auth init failed', { error: err instanceof Error ? err.message : String(err) })
      setLoading(false)
    })

    // Listen for auth changes — skip the INITIAL_SESSION event that fires
    // concurrently with getSession() to avoid double profile fetches
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'INITIAL_SESSION') return

        // Skip if this fires before getSession resolved (race condition)
        if (!initialSessionHandled && event !== 'SIGNED_IN') return

        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          if (event === 'SIGNED_IN') {
            logger.info('User signed in', { user_id: newSession.user.id })
            // New sign-in: upsert profile
            const profile = await upsertProfile(newSession.user)
            setUserProfile(profile)
          } else {
            // Token refresh or other: fetch existing profile
            const profile = await fetchProfile(newSession.user.id)
            setUserProfile(profile)
          }
        } else {
          setUserProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async (credential: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
    })
    if (error) {
      logger.error('Google sign-in failed', { error: error.message })
    }
  }

  const updateBankDetails = async (holder: string, iban: string): Promise<void> => {
    if (!user) throw new Error('Not signed in')

    const { error } = await withTimeout<any>(
      (supabase as any)
        .from('user_profiles')
        .update({
          bank_account_holder: holder || null,
          bank_iban: iban || null,
        })
        .eq('id', user.id),
      35000,
      'Saving bank details timed out. Please check your connection and try again.'
    )

    if (error) {
      logger.error('Failed to update bank details', { error: error.message })
      throw new Error(error.message)
    }

    if (userProfile) {
      setUserProfile({
        ...userProfile,
        bank_account_holder: holder || null,
        bank_iban: iban || null,
      })
    }
  }

  const signOut = async () => {
    logger.info('User signed out', { user_id: user?.id })
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('Sign-out failed', { error: error.message })
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, session, loading, signInWithGoogle, signOut, updateBankDetails }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
