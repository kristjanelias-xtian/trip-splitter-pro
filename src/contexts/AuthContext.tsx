import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types/auth'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
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
    const profile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
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
      console.error('Error upserting profile:', error)
      // Return a local profile if DB fails (e.g., table doesn't exist yet)
      return {
        ...profile,
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
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)

      if (initialSession?.user) {
        const profile = await fetchProfile(initialSession.user.id)
          || await upsertProfile(initialSession.user)
        setUserProfile(profile)
      }

      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          if (event === 'SIGNED_IN') {
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

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, session, loading, signInWithGoogle, signOut }}>
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
