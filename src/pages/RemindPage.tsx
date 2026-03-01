import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { SignInButton } from '@/components/auth/SignInButton'
import { Button } from '@/components/ui/button'

export function RemindPage() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const name = searchParams.get('name')
  const amount = searchParams.get('amount')
  const currency = searchParams.get('currency')
  const payToName = searchParams.get('to')
  const tripName = searchParams.get('trip')

  // All params required — if any missing, show error
  if (!tripCode || !name || !amount || !currency || !payToName || !tripName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-4xl mb-4">&#128279;</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Link not found
          </h1>
          <p className="text-muted-foreground text-sm">
            This reminder link is invalid or incomplete. Ask your organiser to send a new one.
          </p>
        </div>
      </div>
    )
  }

  let formattedAmount: string
  try {
    formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(Number(amount))
  } catch {
    formattedAmount = `${currency} ${Number(amount).toFixed(2)}`
  }

  const handleViewBalance = () => {
    navigate(`/t/${tripCode}/settlements`)
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
            Spl<span style={{ color: '#E8714A', WebkitTextFillColor: '#E8714A' }}>1</span>t
          </h1>
          <p className="text-xs text-muted-foreground">Fair cost splitting for groups</p>
        </div>

        {/* Reminder Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="bg-accent/10 border-b border-border px-6 py-5">
            <p className="text-sm text-muted-foreground mb-1">Payment reminder</p>
            <h2 className="text-lg font-semibold text-foreground leading-tight">
              {tripName}
            </h2>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Greeting */}
            <p className="text-xl font-semibold text-foreground">
              Hi {name}!
            </p>

            {/* Amount box — coral tint matching email style */}
            <div className="rounded-xl border-2 border-[#e8613a] bg-[#fdf1ed] p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#e8613a] mb-1">
                You owe
              </p>
              <p className="text-3xl font-bold text-foreground mb-1">
                {formattedAmount}
              </p>
              <p className="text-sm text-muted-foreground">
                to <strong className="text-foreground">{payToName}</strong>
              </p>
            </div>

            {/* Primary CTA */}
            <Button
              onClick={handleViewBalance}
              className="w-full"
              size="lg"
            >
              View balance & settle up &rarr;
            </Button>

            {/* Sign-in section (unauthenticated only) */}
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
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          No account needed — just click the button above.
        </p>
      </div>
    </div>
  )
}
