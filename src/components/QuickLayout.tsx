import { Outlet, Link, useParams, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, X, ScanLine, Settings, LayoutGrid } from 'lucide-react'
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
import { QuickScanContextSheet } from '@/components/quick/QuickScanContextSheet'
import { QuickScanCreateFlow } from '@/components/quick/QuickScanCreateFlow'
import { useTripContext } from '@/contexts/TripContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { getHiddenTripCodes } from '@/lib/mutedTripsStorage'
import { Toaster } from '@/components/ui/toaster'
import { getTripGradientPattern } from '@/services/tripGradientService'
import { ReportIssueButton } from '@/components/ReportIssueButton'

export function QuickLayout() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentTrip } = useCurrentTrip()
  const { user } = useAuth()
  const { trips } = useTripContext()
  const { setMode } = useUserPreferences()
  const visibleTrips = trips.filter(t => !getHiddenTripCodes().includes(t.trip_code))
  const [scanContextOpen, setScanContextOpen] = useState(false)
  const [scanCreateOpen, setScanCreateOpen] = useState(false)

  const handleScanTap = () => {
    if (visibleTrips.length === 0) {
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
          </>
        )}

        <div className="relative max-w-lg mx-auto px-4">
          <div className="flex flex-col">
            {/* Row 1: back/logo + trip name (full width) + avatar */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                {isInTrip ? (
                  <>
                    <Link to={backTo} className={onGradient ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-foreground'}>
                      {isSubPage ? <X size={20} /> : <ArrowLeft size={20} />}
                    </Link>
                    <div className="min-w-0">
                      <h1 className={`text-base font-semibold line-clamp-2 leading-tight ${onGradient ? 'text-white' : 'text-foreground'}`} style={onGradient ? { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } : undefined}>
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
                {isInTrip && <ReportIssueButton onGradient={onGradient} />}
                {!isInTrip && <ModeToggle onGradient={onGradient} />}
                {user ? <UserMenu onGradient={onGradient} /> : <SignInButton />}
              </div>
            </div>

            {/* Row 2: full-width action strip — only on trip detail page, not sub-pages */}
            {isInTrip && !isSubPage && (
              <div className={`grid grid-cols-3 gap-1.5 pb-2 border-t pt-1.5 ${onGradient ? 'border-white/15' : 'border-border/60'}`}>
                <button
                  onClick={handleScanTap}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    onGradient
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-muted hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <ScanLine size={14} />
                  Scan
                </button>
                <button
                  onClick={() => navigate(`/t/${tripCode}/manage`, { state: { fromQuick: true } })}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    onGradient
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-muted hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <Settings size={14} />
                  Manage
                </button>
                <button
                  onClick={() => { void setMode('full'); navigate(`/t/${tripCode}/expenses`) }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                    onGradient
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-muted hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <LayoutGrid size={14} />
                  Full view
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content — extra top padding when two-row header is active */}
      <main className={isInTrip && !isSubPage ? 'pt-[108px]' : 'pt-16'}>
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
        trips={visibleTrips}
        onNewGroup={() => { setScanContextOpen(false); setScanCreateOpen(true) }}
      />

      <Toaster />
    </div>
  )
}
