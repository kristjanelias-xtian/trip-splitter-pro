import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, DollarSign, CreditCard, UtensilsCrossed,
  ShoppingCart, BarChart3, Settings2, MoreHorizontal
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useAuth } from '@/contexts/AuthContext'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import { ExpenseProvider } from '@/contexts/ExpenseContext'
import { SettlementProvider } from '@/contexts/SettlementContext'
import { MealProvider } from '@/contexts/MealContext'
import { ShoppingProvider } from '@/contexts/ShoppingContext'
import { Toaster } from '@/components/ui/toaster'
import { getTripGradientPattern } from '@/services/tripGradientService'
import { SignInButton } from '@/components/auth/SignInButton'
import { UserMenu } from '@/components/auth/UserMenu'
import { ModeToggle } from '@/components/quick/ModeToggle'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

// Icon mapping
const iconMap = {
  'Overview': Home,
  'Trips': Home,
  'Manage Trip': Settings2,
  'Expenses': DollarSign,
  'Settlements': CreditCard,
  'Meals': UtensilsCrossed,
  'Shopping': ShoppingCart,
  'Dashboard': BarChart3,
  'More': MoreHorizontal,
}

export function Layout() {
  const location = useLocation()
  const { currentTrip, tripCode } = useCurrentTrip()
  const { user } = useAuth()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  // Desktop navigation - all items visible
  const getDesktopNavItems = () => {
    const items = [
      { path: '/', label: 'Trips', requiresTrip: false },
    ]

    if (tripCode) {
      items.push(
        { path: `/t/${tripCode}/manage`, label: 'Manage Trip', requiresTrip: true },
        { path: `/t/${tripCode}/expenses`, label: 'Expenses', requiresTrip: true },
        { path: `/t/${tripCode}/settlements`, label: 'Settlements', requiresTrip: true },
        { path: `/t/${tripCode}/meals`, label: 'Meals', requiresTrip: true },
        { path: `/t/${tripCode}/shopping`, label: 'Shopping', requiresTrip: true },
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

    return [
      { path: `/t/${tripCode}/dashboard`, label: 'Overview', requiresTrip: true },
      { path: `/t/${tripCode}/expenses`, label: 'Expenses', requiresTrip: true },
      { path: `/t/${tripCode}/meals`, label: 'Meals', requiresTrip: true },
      { path: `/t/${tripCode}/shopping`, label: 'Shopping', requiresTrip: true },
    ]
  }

  // Overflow menu items (mobile only)
  const getOverflowMenuItems = () => {
    if (!tripCode) {
      return []
    }

    return [
      { path: '/', label: 'Trips', requiresTrip: false },
      { path: `/t/${tripCode}/manage`, label: 'Manage Trip', requiresTrip: true },
      { path: `/t/${tripCode}/settlements`, label: 'Settlements', requiresTrip: true },
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
    <div className="min-h-screen bg-background">
      {/* Header */}
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {currentTrip ? (
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-lg drop-shadow-md truncate">
                  {currentTrip.name}
                </h1>
              </div>
            ) : (
              <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <img src="/logo.png" alt="Trip Splitter Pro" className="h-9 w-9 rounded-full" />
                <h1 className="text-2xl font-bold text-foreground">
                  Trip Splitter Pro
                </h1>
              </motion.div>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <ModeToggle onGradient={onGradient} />
              {user ? <UserMenu onGradient={onGradient} /> : <SignInButton />}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 lg:ml-64 mt-20">
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

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border soft-shadow-lg lg:hidden z-40">
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
      </nav>

      {/* Side navigation (desktop) */}
      <aside className="hidden lg:block fixed left-0 top-20 bottom-0 w-64 bg-card border-r border-border soft-shadow">
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
      </aside>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
