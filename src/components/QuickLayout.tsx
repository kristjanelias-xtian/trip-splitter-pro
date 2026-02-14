import { Outlet, Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import { ExpenseProvider } from '@/contexts/ExpenseContext'
import { SettlementProvider } from '@/contexts/SettlementContext'
import { MealProvider } from '@/contexts/MealContext'
import { ShoppingProvider } from '@/contexts/ShoppingContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { SignInButton } from '@/components/auth/SignInButton'
import { ModeToggle } from '@/components/quick/ModeToggle'
import { ReportIssueButton } from '@/components/ReportIssueButton'
import { Toaster } from '@/components/ui/toaster'
import { getTripGradientPattern } from '@/services/tripGradientService'

export function QuickLayout() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const location = useLocation()
  const { currentTrip } = useCurrentTrip()
  const { user } = useAuth()

  const isInTrip = !!tripCode
  // On sub-pages (e.g. history), back goes to trip detail; on trip detail, back goes to /quick
  const isSubPage = isInTrip && location.pathname !== `/t/${tripCode}/quick`
  const backTo = isSubPage ? `/t/${tripCode}/quick` : '/quick'

  const pattern = currentTrip ? getTripGradientPattern(currentTrip.name) : null
  const onGradient = !!pattern

  return (
    <div className="min-h-screen bg-background">
      {/* Simplified header */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${pattern ? '' : 'bg-card border-b border-border soft-shadow-sm'}`}>
        {/* Gradient background when in a trip */}
        {pattern && (
          <>
            <div className="absolute inset-0" style={{ background: pattern.gradient }} />
            {pattern.icons.slice(0, 2).map((icon, i) => {
              const Icon = icon.Icon
              return (
                <Icon
                  key={i}
                  size={icon.size * 0.6}
                  className="absolute text-white pointer-events-none"
                  style={{
                    left: `${icon.x}%`,
                    top: `${icon.y}%`,
                    transform: `translate(-50%, -50%) rotate(${icon.rotation}deg)`,
                    opacity: icon.opacity * 0.8,
                  }}
                />
              )
            })}
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
          </>
        )}

        <div className="relative max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {isInTrip ? (
                <>
                  <Link to={backTo} className={onGradient ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}>
                    <ArrowLeft size={20} />
                  </Link>
                  <h1 className={`text-lg font-semibold truncate ${onGradient ? 'text-white drop-shadow-md' : 'text-foreground'}`}>
                    {currentTrip?.name || 'Loading...'}
                  </h1>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Split" className="h-8 w-8 rounded-full" />
                  <h1 className="text-lg font-semibold text-foreground">
                    Split
                  </h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ReportIssueButton onGradient={onGradient} />
              <ModeToggle onGradient={onGradient} />
              {user ? <UserMenu onGradient={onGradient} /> : <SignInButton />}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16">
        <ParticipantProvider>
          <ExpenseProvider>
            <SettlementProvider>
              <MealProvider>
                <ShoppingProvider>
                  <Outlet />
                </ShoppingProvider>
              </MealProvider>
            </SettlementProvider>
          </ExpenseProvider>
        </ParticipantProvider>
      </main>

      <Toaster />
    </div>
  )
}
