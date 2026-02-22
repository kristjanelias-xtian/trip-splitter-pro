import { Outlet, Link, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import { ExpenseProvider } from '@/contexts/ExpenseContext'
import { SettlementProvider } from '@/contexts/SettlementContext'
import { MealProvider } from '@/contexts/MealContext'
import { ShoppingProvider } from '@/contexts/ShoppingContext'
import { ReceiptProvider } from '@/contexts/ReceiptContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { SignInButton } from '@/components/auth/SignInButton'
import { ModeToggle } from '@/components/quick/ModeToggle'
import { ReportIssueButton } from '@/components/ReportIssueButton'
import { QuickScanContextSheet } from '@/components/quick/QuickScanContextSheet'
import { QuickScanCreateFlow } from '@/components/quick/QuickScanCreateFlow'
import { useTripContext } from '@/contexts/TripContext'
import { Toaster } from '@/components/ui/toaster'
import { getTripGradientPattern } from '@/services/tripGradientService'

export function QuickLayout() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const location = useLocation()
  const { currentTrip } = useCurrentTrip()
  const { user } = useAuth()
  const { trips } = useTripContext()
  const [scanContextOpen, setScanContextOpen] = useState(false)
  const [scanCreateOpen, setScanCreateOpen] = useState(false)

  const handleScanTap = () => {
    if (trips.length === 0) {
      setScanCreateOpen(true)
    } else {
      setScanContextOpen(true)
    }
  }

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
                  <div className="min-w-0">
                    <h1 className={`text-lg font-semibold truncate leading-tight ${onGradient ? 'text-white drop-shadow-md' : 'text-foreground'}`}>
                      {currentTrip?.name}
                    </h1>
                    {currentTrip && (
                      <p className={`text-xs leading-tight ${onGradient ? 'text-white/60' : 'text-muted-foreground'}`}>
                        {currentTrip.event_type === 'event' ? 'Event' : 'Trip'}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Spl1t" className="h-8 w-8 rounded-full" />
                  <h1 className="text-lg font-semibold text-foreground">
                    Spl1t
                  </h1>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ReportIssueButton onGradient={onGradient} />
              {isInTrip && (
                <button
                  onClick={handleScanTap}
                  aria-label="Scan receipt"
                  className={`p-2 rounded-md transition-colors ${onGradient ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                >
                  <ScanLine size={20} />
                </button>
              )}
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
                  <ReceiptProvider>
                    <Outlet />
                    <QuickScanCreateFlow open={scanCreateOpen} onOpenChange={setScanCreateOpen} />
                  </ReceiptProvider>
                </ShoppingProvider>
              </MealProvider>
            </SettlementProvider>
          </ExpenseProvider>
        </ParticipantProvider>
      </main>

      <QuickScanContextSheet
        open={scanContextOpen}
        onOpenChange={setScanContextOpen}
        trips={trips}
        onNewGroup={() => { setScanContextOpen(false); setScanCreateOpen(true) }}
      />

      <Toaster />
    </div>
  )
}
