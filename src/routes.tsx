import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { QuickLayout } from './components/QuickLayout'
import { TripRouteGuard } from './components/TripRouteGuard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConditionalHomePage } from './pages/ConditionalHomePage'
import { JoinPage } from './pages/JoinPage'
import { TripsPage } from './pages/TripsPage'
import { ManageTripPage } from './pages/ManageTripPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { PlannerPage } from './pages/PlannerPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { AdminAllTripsPage } from './pages/AdminAllTripsPage'
import { TripNotFoundPage } from './pages/TripNotFoundPage'
import { QuickHomeScreen } from './pages/QuickHomeScreen'
import { QuickGroupDetailPage } from './pages/QuickGroupDetailPage'
import { QuickHistoryPage } from './pages/QuickHistoryPage'
import { useUserPreferences } from './contexts/UserPreferencesContext'

function TripModeRedirect() {
  const { mode } = useUserPreferences()
  return <Navigate to={mode === 'quick' ? 'quick' : 'dashboard'} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Special routes - outside Layout */}
      <Route path="admin/all-trips" element={<ErrorBoundary><AdminAllTripsPage /></ErrorBoundary>} />
      <Route path="trip-not-found/:tripCode" element={<ErrorBoundary><TripNotFoundPage /></ErrorBoundary>} />
      <Route path="join/:token" element={<ErrorBoundary><JoinPage /></ErrorBoundary>} />

      {/* Mode-aware redirect for shared trip links */}
      <Route path="t/:tripCode" element={<TripModeRedirect />} />

      {/* Quick Mode routes */}
      <Route path="/quick" element={<QuickLayout />}>
        <Route index element={<ErrorBoundary><QuickHomeScreen /></ErrorBoundary>} />
      </Route>
      <Route path="/t/:tripCode/quick" element={<QuickLayout />}>
        <Route index element={<ErrorBoundary><QuickGroupDetailPage /></ErrorBoundary>} />
        <Route path="history" element={<ErrorBoundary><QuickHistoryPage /></ErrorBoundary>} />
      </Route>

      {/* Full Mode routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<ErrorBoundary><ConditionalHomePage /></ErrorBoundary>} />
        <Route path="create-trip" element={<ErrorBoundary><TripsPage /></ErrorBoundary>} />
        <Route path="t/:tripCode/manage" element={<TripRouteGuard><ErrorBoundary><ManageTripPage /></ErrorBoundary></TripRouteGuard>} />
        <Route path="t/:tripCode/expenses" element={<TripRouteGuard><ErrorBoundary><ExpensesPage /></ErrorBoundary></TripRouteGuard>} />
        <Route path="t/:tripCode/settlements" element={<TripRouteGuard><ErrorBoundary><SettlementsPage /></ErrorBoundary></TripRouteGuard>} />
        <Route path="t/:tripCode/planner" element={<TripRouteGuard><ErrorBoundary><PlannerPage /></ErrorBoundary></TripRouteGuard>} />
        <Route path="t/:tripCode/meals" element={<Navigate to="../planner" replace />} />
        <Route path="t/:tripCode/shopping" element={<TripRouteGuard><ErrorBoundary><ShoppingPage /></ErrorBoundary></TripRouteGuard>} />
        <Route path="t/:tripCode/dashboard" element={<TripRouteGuard><ErrorBoundary><DashboardPage /></ErrorBoundary></TripRouteGuard>} />
      </Route>
    </Routes>
  )
}
