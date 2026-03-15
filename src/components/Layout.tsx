// SPDX-License-Identifier: Apache-2.0
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import React from 'react'
import { useState } from 'react'
import {
  Home, DollarSign, CreditCard, CalendarDays,
  ShoppingCart, BarChart3, Settings2, ScanLine, Settings, Zap, Shield, ArrowLeft
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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

import { ReportIssueButton } from '@/components/ReportIssueButton'
import { isAdminUser } from '@/lib/adminAuth'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { ModeToggle } from '@/components/quick/ModeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { QuickScanContextSheet } from '@/components/quick/QuickScanContextSheet'
import { QuickScanCreateFlow } from '@/components/quick/QuickScanCreateFlow'
import { PullToRefreshProvider } from '@/contexts/PullToRefreshContext'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator'
import { getHiddenTripCodes } from '@/lib/mutedTripsStorage'

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  'Overview': Home,
  'Trips': Home,
  'Manage Trip': Settings2,
  'Manage Event': Settings2,
  'Expenses': DollarSign,
  'Settlements': CreditCard,
  'Day Planner': CalendarDays,
  'Planner': CalendarDays,
  'Shopping': ShoppingCart,
  'Dashboard': BarChart3,
}

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentTrip, tripCode } = useCurrentTrip()
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

  const manageLabel = currentTrip?.event_type === 'event' ? 'Manage Event' : 'Manage Trip'

  // Desktop navigation - all items visible
  const getDesktopNavItems = () => {
    const items: { path: string; label: string; iconKey: string; requiresTrip: boolean }[] = []

    if (tripCode) {
      items.push(
        { path: `/t/${tripCode}/dashboard`, label: t('dashboard.title'), iconKey: 'Dashboard', requiresTrip: true },
        { path: `/t/${tripCode}/expenses`, label: t('layout.expenses'), iconKey: 'Expenses', requiresTrip: true },
        { path: `/t/${tripCode}/settlements`, label: t('layout.settlements'), iconKey: 'Settlements', requiresTrip: true },
      )
      if (currentTrip?.enable_meals || currentTrip?.enable_activities) {
        items.push({ path: `/t/${tripCode}/planner`, label: t('planner.title'), iconKey: 'Day Planner', requiresTrip: true })
      }
      if (currentTrip?.enable_shopping) {
        items.push({ path: `/t/${tripCode}/shopping`, label: t('layout.shopping'), iconKey: 'Shopping', requiresTrip: true })
      }
      items.push(
        { path: `/t/${tripCode}/manage`, label: manageLabel, iconKey: manageLabel, requiresTrip: true },
      )
    }

    return items
  }

  // Mobile navigation - content tabs only
  const getMobileNavItems = () => {
    if (!tripCode) {
      return [
        { path: '/', label: t('home.eventsAndTrips'), iconKey: 'Trips', requiresTrip: false },
      ]
    }

    const items = [
      { path: `/t/${tripCode}/dashboard`, label: t('layout.overview'), iconKey: 'Overview', requiresTrip: true },
      { path: `/t/${tripCode}/expenses`, label: t('layout.expenses'), iconKey: 'Expenses', requiresTrip: true },
      { path: `/t/${tripCode}/settlements`, label: t('layout.settlements'), iconKey: 'Settlements', requiresTrip: true },
    ]
    if (currentTrip?.enable_meals || currentTrip?.enable_activities) {
      items.push({ path: `/t/${tripCode}/planner`, label: t('layout.planner'), iconKey: 'Planner', requiresTrip: true })
    }
    if (currentTrip?.enable_shopping) {
      items.push({ path: `/t/${tripCode}/shopping`, label: t('layout.shopping'), iconKey: 'Shopping', requiresTrip: true })
    }
    return items
  }

  const desktopNavItems = getDesktopNavItems()
  const mobileNavItems = getMobileNavItems()

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
      <header className={`fixed top-0 left-0 right-0 z-50 pwa-safe-top ${pattern ? 'bg-black' : 'bg-card border-b border-border soft-shadow-sm'}`}>
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

        <div className={`relative mx-auto ${tripCode ? 'px-4 sm:px-6 lg:px-8' : 'max-w-4xl px-4'}`}>
          <div className="flex flex-col">
            {/* Row 1 */}
            <div className="flex items-center justify-between py-4">
              {currentTrip ? (
                <Link to="/" state={{ fromTrip: true }} className="flex items-center gap-3 flex-1 min-w-0">
                  <ArrowLeft size={20} className={`shrink-0 ${onGradient ? 'text-white/80' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <h1
                      className={`font-bold text-lg truncate ${onGradient ? 'text-white' : 'text-foreground'}`}
                      style={onGradient ? { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } : undefined}
                    >
                      {currentTrip.name}
                    </h1>
                    <p className={`text-xs leading-tight ${onGradient ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {currentTrip.event_type === 'event' ? t('trip.eventLabel') : t('trip.tripLabel')}
                    </p>
                  </div>
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
                    Spl<span className="text-primary">1</span>t
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
                {tripCode && currentTrip && (
                  <div className="hidden lg:flex">
                    <ModeToggle onGradient={onGradient} />
                  </div>
                )}
                <LanguageToggle size="compact" onGradient={onGradient} />
                {user ? <UserMenu onGradient={onGradient} /> : <SignInButton />}
              </div>
            </div>

            {/* Row 2: action pills — shown when in a trip and loaded (mobile only) */}
            {tripCode && currentTrip && (() => {
              const pillClass = `flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                onGradient ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-muted hover:bg-muted/70 text-foreground'
              }`
              const modePillClass = `flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                onGradient ? 'border-white/40 bg-white/15 hover:bg-white/25 text-white' : 'border-primary/40 bg-primary/10 hover:bg-primary/15 text-primary'
              }`
              return (
                <div className={`grid grid-cols-3 gap-1.5 pb-2 border-t pt-1.5 lg:hidden ${onGradient ? 'border-white/15' : 'border-border/60'}`}>
                  <button onClick={handleScanTap} className={pillClass}>
                    <ScanLine size={14} />
                    {t('layout.scanReceipt')}
                  </button>
                  <button onClick={() => navigate(`/t/${tripCode}/manage`)} className={pillClass}>
                    <Settings size={14} />
                    {t('layout.manage')}
                  </button>
                  <button onClick={() => { void setMode('quick'); navigate(`/t/${tripCode}/quick`) }} className={modePillClass}>
                    <Zap size={14} />
                    {t('quick.quickView')}
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 pwa-safe-bottom-margin ${tripCode ? 'lg:ml-64' : ''} ${tripCode && currentTrip ? 'mt-[calc(120px+var(--safe-area-top))] lg:mt-20' : 'mt-[calc(88px+var(--safe-area-top))]'}`}>
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
            const Icon = iconMap[item.iconKey as keyof typeof iconMap]
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

        </div>
      </nav>}

      {/* Side navigation (desktop) */}
      {tripCode && <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-card border-r border-border soft-shadow">
        <nav className="px-3 py-6 space-y-1">
          {desktopNavItems.map((item) => {
            const Icon = iconMap[item.iconKey as keyof typeof iconMap]
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
