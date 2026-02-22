import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { SignInButton } from '@/components/auth/SignInButton'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'

interface InvitationData {
  id: string
  token: string
  status: string
  participant_id: string
  participant_name: string
  trip_id: string
  trip_name: string
  trip_code: string
}

type PageState = 'loading' | 'found' | 'not_found' | 'accepted' | 'linking'

export function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const { user } = useAuth()
  const { refreshTrips } = useTripContext()
  const navigate = useNavigate()
  const { newSignal, cancel } = useAbortController()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  // Load invitation by token
  useEffect(() => {
    if (!token) {
      setPageState('not_found')
      return
    }

    const signal = newSignal()

    async function loadInvitation() {
      const { data, error } = await withTimeout<any>(
        supabase
          .from('invitations')
          .select(`
            id,
            token,
            status,
            participant_id
          `)
          .eq('token', token!)
          .abortSignal(signal)
          .maybeSingle(),
        15000,
        'Loading invitation timed out.'
      )

      if (signal.aborted) return

      if (error || !data) {
        setPageState('not_found')
        return
      }

      // Fetch participant and trip details separately
      const { data: participant } = await withTimeout<any>(
        (supabase as any)
          .from('participants')
          .select('id, name, trip_id')
          .eq('id', data.participant_id)
          .single()
          .abortSignal(signal),
        15000,
        'Loading participant timed out.'
      )

      if (signal.aborted) return

      if (!participant) {
        setPageState('not_found')
        return
      }

      const { data: trip } = await withTimeout<any>(
        (supabase as any)
          .from('trips')
          .select('id, name, trip_code')
          .eq('id', participant.trip_id)
          .single()
          .abortSignal(signal),
        15000,
        'Loading trip timed out.'
      )

      if (signal.aborted) return

      if (!trip) {
        setPageState('not_found')
        return
      }

      setInvitation({
        id: data.id,
        token: data.token,
        status: data.status,
        participant_id: data.participant_id,
        participant_name: participant.name,
        trip_id: trip.id,
        trip_name: trip.name,
        trip_code: trip.trip_code,
      })

      setPageState(data.status === 'accepted' ? 'accepted' : 'found')
    }

    loadInvitation()
    return cancel
  }, [token])

  // Auto-link when user signs in on this page
  useEffect(() => {
    if (!user || !invitation || pageState !== 'found') return

    async function linkAndAccept() {
      setPageState('linking')
      setLinkError(null)

      try {
        // Link auth user to participant
        const { error: linkError } = await withTimeout<any>(
          (supabase as any)
            .from('participants')
            .update({ user_id: user!.id, email: user!.email || null })
            .eq('id', invitation!.participant_id),
          35000,
          'Linking account timed out. Please check your connection and try again.'
        )

        if (linkError) throw linkError

        // Mark invitation as accepted
        await withTimeout(
          supabase
            .from('invitations')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', invitation!.id),
          35000,
          'Accepting invitation timed out.'
        )

        logger.info('Invitation accepted', {
          invitation_id: invitation!.id,
          trip_id: invitation!.trip_id,
        })

        // Refresh trips so the newly linked trip appears before navigating
        await refreshTrips()

        // Navigate to the trip
        navigate(`/t/${invitation!.trip_code}/quick`, { replace: true })
      } catch (err) {
        logger.error('Failed to link user to participant', { error: String(err) })
        setLinkError('Failed to link your account. Please try again.')
        setPageState('found')
      }
    }

    linkAndAccept()
  }, [user, invitation, pageState, navigate])

  const handleOpenTrip = () => {
    if (invitation) {
      navigate(`/t/${invitation.trip_code}/quick`)
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading your invitation…</p>
        </div>
      </div>
    )
  }

  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Link not found
          </h1>
          <p className="text-muted-foreground text-sm">
            This invite link is invalid or has expired. Ask your organiser to send a new one.
          </p>
        </div>
      </div>
    )
  }

  if (pageState === 'linking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Linking your account…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold tracking-tight mb-1"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Spl1t
          </h1>
          <p className="text-xs text-muted-foreground">Fair cost splitting for groups</p>
        </div>

        {/* Welcome Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="bg-accent/10 border-b border-border px-6 py-5">
            <p className="text-sm text-muted-foreground mb-1">You've been added to</p>
            <h2 className="text-lg font-semibold text-foreground leading-tight">
              {invitation?.trip_name}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Greeting */}
            <div>
              <p className="text-xl font-semibold text-foreground">
                Hi {invitation?.participant_name}!
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your expenses have been tracked. Click below to see your balance.
              </p>
            </div>

            {/* Error */}
            {linkError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {linkError}
              </div>
            )}

            {/* Primary CTA */}
            <Button
              onClick={handleOpenTrip}
              className="w-full"
              size="lg"
            >
              Open {invitation?.trip_name} →
            </Button>

            {/* Divider */}
            {!user && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-xs text-muted-foreground">
                      Optional
                    </span>
                  </div>
                </div>

                {/* Sign-in section */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Link your Google account
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      See all your splits across events in one place
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <SignInButton type="standard" />
                  </div>
                </div>
              </>
            )}

            {user && pageState === 'accepted' && (
              <p className="text-sm text-center text-muted-foreground">
                Your account is already linked.
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          No account needed — just click "Open" above.
        </p>
      </div>
    </div>
  )
}
