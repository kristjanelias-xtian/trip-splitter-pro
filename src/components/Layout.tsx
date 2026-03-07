import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import React from 'react'
import { useState } from 'react'
import {
  Home, DollarSign, CreditCard, CalendarDays,
  ShoppingCart, BarChart3, Settings2, MoreHorizontal, ScanLine, Settings, Zap, Shield, ArrowLeft
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { useTripContext } from '@/contexts/TripContext'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import { ExpenseProvider } from '@/contexts/ExpenseContext'
import { SettlementProvider } from '@/contexts/SettlementContext'
import { MealProvider } from '@/contexts/MealContext'
import { ActivityProvider } from '@/contexts/ActivityContext'
import { StayProvider } from '@/contexts/StayContext'
import { ShoppingProvider } from '@/contexts/ShoppingContext'
import { ReceiptProvider } from '@/contexts/ReceiptContext'
import { Toaster } from '@/components/ui/toaster'
import { getTripGradientPattern } from '@/services/tripGradientService'
import { SignInButton } from '@/components/auth/SignInButton'
import { UserMenu } from '@/components/auth/UserMenu'
import { ModeToggle } from '@/components/quick/ModeToggle'
import { ReportIssueButton } from '@/components/ReportIssueButton'
import { isAdminUser } from '@/lib/adminAuth'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { QuickScanContextSheet } from '@/components/quick/QuickScanContextSheet'
import { QuickScanCreateFlow } from '@/components/quick/QuickScanCreateFlow'
import { PullToRefreshProvider } from '@/contexts/PullToRefreshContext'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator'
import { getHiddenTripCodes } from '@/lib/mutedTripsStorage'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  'Overview': Home,
  'Trips': Home,
  'Events & Trips': Home,
  'Manage Trip': Settings2,
  'Manage Event': Settings2,
  'Expenses': DollarSign,
  'Settlements': CreditCard,
  'Day Planner': CalendarDays,
  'Planner': CalendarDays,
  'Shopping': ShoppingCart,
  'Dashboard': BarChart3,
  'More': MoreHorizontal,
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentTrip, tripCode } = useCurrentTrip()
  const { user } = useAuth()
  const { trips } = useTripContext()
  const { setMode } = useUserPreferences()
  const visibleTrips = trips.filter(t => !getHiddenTripCodes().includes(t.trip_code))
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [scanContextOpen, setScanContextOpen] = useState(false)
  const [scanCreateOpen, setScanCreateOpen] = useState(false)

  const handleScanTap = () => {
    if (visibleTrips.length === 0) {
      setScanCreateOpen(true)
    } else {
      setScanContextOpen(true)
    }
  }

  const manageLabel = currentTrip?.event_type === 'event' ? 'Manage Event' : 'Manage Trip'

  // Desktop navigation - all items visible
  const getDesktopNavItems = () => {
    const items = [
      { path: '/', label: 'Events & Trips', requiresTrip: false },
    ]

    if (tripCode) {
      items.push(
        { path: `/t/${tripCode}/manage`, label: manageLabel, requiresTrip: true },
        { path: `/t/${tripCode}/expenses`, label: 'Expenses', requiresTrip: true },
        { path: `/t/${tripCode}/settlements`, label: 'Settlements', requiresTrip: true },
      )
      if (currentTrip?.enable_meals || currentTrip?.enable_activities) {
        items.push({ path: `/t/${tripCode}/planner`, label: 'Day Planner', requiresTrip: true })
      }
      if (currentTrip?.enable_shopping) {
        items.push({ path: `/t/${tripCode}/shopping`, label: 'Shopping', requiresTrip: true })
      }
      items.push(
        { path: `/t/${tripCode}/dashboard`, label: 'Dashboard', requiresTrip: true },
      )
    }

    return items
  }

  // Mobile navigation - 5 primary items + overflow menu
  const getMobileNavItems = () => {
    if (!tripCode) {
      return [
        { path: '/', label: 'Trips', requiresTrip: false },
      ]
    }

    const items = [
      { path: `/t/${tripCode}/dashboard`, label: 'Overview', requiresTrip: true },
      { path: `/t/${tripCode}/expenses`, label: 'Expenses', requiresTrip: true },
      { path: `/t/${tripCode}/settlements`, label: 'Settlements', requiresTrip: true },
    ]
    if (currentTrip?.enable_meals || currentTrip?.enable_activities) {
      items.push({ path: `/t/${tripCode}/planner`, label: 'Planner', requiresTrip: true })
    }
    if (currentTrip?.enable_shopping) {
      items.push({ path: `/t/${tripCode}/shopping`, label: 'Shopping', requiresTrip: true })
    }
    return items
  }

  // Overflow menu items (mobile only)
  const getOverflowMenuItems = () => {
    if (!tripCode) {
      return []
    }

    return [
      { path: '/', label: 'Events & Trips', requiresTrip: false },
      { path: `/t/${tripCode}/manage`, label: manageLabel, requiresTrip: true },
    ]
  }

  const desktopNavItems = getDesktopNavItems()
  const mobileNavItems = getMobileNavItems()
  const overflowMenuItems = getOverflowMenuItems()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname === path
  }

  const pattern = currentTrip ? getTripGradientPattern(currentTrip.name) : null
  const onGradient = !!pattern

  return (
    <PullToRefreshProvider>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${pattern ? 'bg-black' : 'bg-card border-b border-border soft-shadow-sm'}`}>
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/15 to-black/5" />
          </>
        )}

        <div className={`relative mx-auto ${tripCode ? 'max-w-7xl px-4 sm:px-6 lg:px-8' : 'max-w-4xl px-4'}`}>
          <div className="flex flex-col">
            {/* Row 1 */}
            <div className="flex items-center justify-between py-4">
              {currentTrip ? (
                <Link to="/" state={{ fromTrip: true }} className="flex items-center gap-3 flex-1 min-w-0">
                  <ArrowLeft size={20} className={`shrink-0 ${onGradient ? 'text-white/80' : 'text-muted-foreground'}`} />
                  <h1
                    className={`font-bold text-lg truncate ${onGradient ? 'text-white' : 'text-foreground'}`}
                    style={onGradient ? { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } : undefined}
                  >
                    {currentTrip.name}
                  </h1>
                </Link>
              ) : (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <img src="/logo.png?v=2" alt="Spl1t" className="h-9 w-9 rounded-full" />
                  <h1 className="text-2xl font-bold text-foreground">
                    Spl<span className="text-[#E8714A]">1</span>t
                  </h1>
                </motion.div>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {user && isAdminUser(user.id) && (
                  <button
                    onClick={() => navigate('/admin/all-trips')}
                    className={`p-2 rounded-md transition-colors ${
                      onGradient
                        ? 'text-white/70 hover:text-white hover:bg-white/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    title="Admin"
                  >
                    <Shield size={18} />
                  </button>
                )}
                <ReportIssueButton onGradient={onGradient} />
                {/* In trip: show scan + mode toggle (desktop only; Row 2 handles mobile). On home: hidden (page has its own scan CTA) */}
                {tripCode && (
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      onClick={handleScanTap}
                      aria-label="Scan receipt"
                      className={`p-2 rounded-md transition-colors ${onGradient ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                    >
                      <ScanLine size={20} />
                    </button>
                    <ModeToggle onGradient={onGradient} />
                  </div>
                )}
                {user ? <UserMenu onGradient={onGradient} /> : <SignInButton />}
              </div>
            </div>

            {/* Row 2: action pills — shown when in a trip and loaded */}
            {tripCode && currentTrip && (() => {
              const pillClass = `flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                onGradient ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-muted hover:bg-muted/70 text-foreground'
              }`
              const modePillClass = `flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                onGradient ? 'border-white/40 bg-white/15 hover:bg-white/25 text-white' : 'border-primary/40 bg-primary/10 hover:bg-primary/15 text-primary'
              }`
              return (
                <div className={`lg:hidden grid grid-cols-3 gap-1.5 pb-2 border-t pt-1.5 ${onGradient ? 'border-white/15' : 'border-border/60'}`}>
                  <button onClick={handleScanTap} className={pillClass}>
                    <ScanLine size={14} />
                    Scan
                  </button>
                  <button onClick={() => navigate(`/t/${tripCode}/manage`)} className={pillClass}>
                    <Settings size={14} />
                    Manage
                  </button>
                  <button onClick={() => { void setMode('quick'); navigate(`/t/${tripCode}/quick`) }} className={modePillClass}>
                    <Zap size={14} />
                    Quick view
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 pwa-safe-bottom-margin ${tripCode ? 'lg:ml-64' : ''} ${tripCode && currentTrip ? 'mt-[108px] lg:mt-20' : 'mt-20'}`}>
        <LayoutPullIndicator />
        <ParticipantProvider>
          <ExpenseProvider>
            <SettlementProvider>
              <MealProvider>
                <ActivityProvider>
                  <StayProvider>
                    <ShoppingProvider>
                      <ReceiptProvider>
                        <Outlet />
                        <QuickScanCreateFlow open={scanCreateOpen} onOpenChange={setScanCreateOpen} />
                      </ReceiptProvider>
                    </ShoppingProvider>
                  </StayProvider>
                </ActivityProvider>
              </MealProvider>
            </SettlementProvider>
          </ExpenseProvider>
        </ParticipantProvider>
      </main>

      {/* Bottom navigation (mobile) — only shown inside a trip */}
      {tripCode && <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border soft-shadow-lg lg:hidden z-40 pwa-safe-bottom">
        <div className="flex justify-around items-center h-16">
          {mobileNavItems.map((item) => {
            const Icon = iconMap[item.label as keyof typeof iconMap]
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center w-full h-full relative"
              >
                {active && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-x-2 top-0 h-1 bg-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  className="flex flex-col items-center"
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon
                    size={20}
                    className={active ? 'text-primary' : 'text-muted-foreground'}
                  />
                  <span
                    className={`text-xs mt-1 ${
                      active ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}

          {/* More menu button */}
          <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center w-full h-full relative">
                {overflowMenuItems.some(item => isActive(item.path)) && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-x-2 top-0 h-1 bg-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  className="flex flex-col items-center"
                  whileTap={{ scale: 0.95 }}
                >
                  <MoreHorizontal
                    size={20}
                    className={
                      overflowMenuItems.some(item => isActive(item.path))
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }
                  />
                  <span
                    className={`text-xs mt-1 ${
                      overflowMenuItems.some(item => isActive(item.path))
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    More
                  </span>
                </motion.div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>More Options</SheetTitle>
                <SheetDescription>
                  Additional navigation options
                </SheetDescription>
              </SheetHeader>
              <nav className="mt-6 space-y-2">
                {overflowMenuItems.map((item) => {
                  const Icon = iconMap[item.label as keyof typeof iconMap]
                  const active = isActive(item.path)

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      state={item.path === '/' ? { fromTrip: true } : undefined}
                      onClick={() => setMoreMenuOpen(false)}
                      className="block relative"
                    >
                      <motion.div
                        className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>}

      {/* Side navigation (desktop) */}
      {tripCode && <aside className="hidden lg:block fixed left-0 top-20 bottom-0 w-64 bg-card border-r border-border soft-shadow">
        <nav className="px-3 py-6 space-y-1">
          {desktopNavItems.map((item) => {
            const Icon = iconMap[item.label as keyof typeof iconMap]
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className="block relative"
              >
                {active && (
                  <motion.div
                    layoutId="desktop-nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <motion.div
                  className={`relative flex items-center px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  whileHover={!active ? { x: 4 } : {}}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={20} className="mr-3" />
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>
      </aside>}

      <QuickScanContextSheet
        open={scanContextOpen}
        onOpenChange={setScanContextOpen}
        trips={visibleTrips}
        onNewGroup={() => { setScanContextOpen(false); setScanCreateOpen(true) }}
      />

      {/* Toast notifications */}
      <Toaster />
    </div>
    </PullToRefreshProvider>
  )
}

function LayoutPullIndicator() {
  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh()
  return <PullToRefreshIndicator pullDistance={pullDistance} isPulling={isPulling} isRefreshing={isRefreshing} />
}
