import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'
import { ParticipantProvider } from '@/contexts/ParticipantContext'
import { ExpenseProvider } from '@/contexts/ExpenseContext'

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { tripId } = useCurrentTrip()
  const { trips } = useTripContext()

  const getNavItems = () => {
    const items = [
      { path: '/', label: 'Trips', icon: '🏠', requiresTrip: false },
    ]

    if (tripId) {
      items.push(
        { path: `/trips/${tripId}/setup`, label: 'Setup', icon: '👥', requiresTrip: true },
        { path: `/trips/${tripId}/expenses`, label: 'Expenses', icon: '💰', requiresTrip: true },
        { path: `/trips/${tripId}/meals`, label: 'Meals', icon: '🍽️', requiresTrip: true },
        { path: `/trips/${tripId}/shopping`, label: 'Shopping', icon: '🛒', requiresTrip: true },
        { path: `/trips/${tripId}/dashboard`, label: 'Dashboard', icon: '📊', requiresTrip: true },
      )
    }

    items.push({ path: '/settings', label: 'Settings', icon: '⚙️', requiresTrip: false })

    return items
  }

  const navItems = getNavItems()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname === path
  }

  const handleTripChange = (newTripId: string) => {
    // Navigate to the same page type for the new trip
    if (location.pathname.includes('/expenses')) {
      navigate(`/trips/${newTripId}/expenses`)
    } else if (location.pathname.includes('/setup')) {
      navigate(`/trips/${newTripId}/setup`)
    } else if (location.pathname.includes('/meals')) {
      navigate(`/trips/${newTripId}/meals`)
    } else if (location.pathname.includes('/shopping')) {
      navigate(`/trips/${newTripId}/shopping`)
    } else if (location.pathname.includes('/dashboard')) {
      navigate(`/trips/${newTripId}/dashboard`)
    } else {
      navigate(`/trips/${newTripId}/expenses`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Trip Splitter Pro
            </h1>
            {trips.length > 0 && tripId && (
              <div className="flex items-center gap-2">
                <label htmlFor="trip-selector" className="text-sm text-gray-600 dark:text-gray-400">
                  Current Trip:
                </label>
                <select
                  id="trip-selector"
                  value={tripId || ''}
                  onChange={(e) => handleTripChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-neutral focus:border-transparent"
                >
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6 lg:ml-64">
        <ParticipantProvider>
          <ExpenseProvider>
            <Outlet />
          </ExpenseProvider>
        </ParticipantProvider>
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 lg:hidden">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive(item.path)
                  ? 'text-neutral dark:text-neutral-light'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Side navigation (desktop) */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-20">
        <nav className="px-4 py-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-neutral text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="text-xl mr-3">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  )
}
