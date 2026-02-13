import { Outlet, Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import { ExpenseProvider } from '@/contexts/ExpenseContext'
import { SettlementProvider } from '@/contexts/SettlementContext'
import { MealProvider } from '@/contexts/MealContext'
import { ShoppingProvider } from '@/contexts/ShoppingContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { ModeToggle } from '@/components/quick/ModeToggle'
import { Toaster } from '@/components/ui/toaster'

export function QuickLayout() {
  const { tripCode } = useParams<{ tripCode: string }>()
  const { currentTrip } = useCurrentTrip()
  const { user } = useAuth()

  const isInTrip = !!tripCode

  return (
    <div className="min-h-screen bg-background">
      {/* Simplified header */}
      <header className="bg-card border-b border-border soft-shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {isInTrip ? (
                <>
                  <Link to="/quick" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                  </Link>
                  <h1 className="text-lg font-semibold text-foreground truncate">
                    {currentTrip?.name || 'Loading...'}
                  </h1>
                </>
              ) : (
                <h1 className="text-lg font-semibold text-foreground">
                  Trip Splitter
                </h1>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ModeToggle />
              {user && <UserMenu />}
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
