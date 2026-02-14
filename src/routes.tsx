import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { QuickLayout } from './components/QuickLayout'
import { TripRouteGuard } from './components/TripRouteGuard'
import { ConditionalHomePage } from './pages/ConditionalHomePage'
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
      <Route path="admin/all-trips" element={<AdminAllTripsPage />} />
      <Route path="trip-not-found/:tripCode" element={<TripNotFoundPage />} />

      {/* Mode-aware redirect for shared trip links */}
      <Route path="t/:tripCode" element={<TripModeRedirect />} />

      {/* Quick Mode routes */}
      <Route path="/quick" element={<QuickLayout />}>
        <Route index element={<QuickHomeScreen />} />
      </Route>
      <Route path="/t/:tripCode/quick" element={<QuickLayout />}>
        <Route index element={<QuickGroupDetailPage />} />
        <Route path="history" element={<QuickHistoryPage />} />
      </Route>

      {/* Full Mode routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<ConditionalHomePage />} />
        <Route path="create-trip" element={<TripsPage />} />
        <Route path="t/:tripCode/manage" element={<TripRouteGuard><ManageTripPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/expenses" element={<TripRouteGuard><ExpensesPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/settlements" element={<TripRouteGuard><SettlementsPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/planner" element={<TripRouteGuard><PlannerPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/meals" element={<Navigate to="../planner" replace />} />
        <Route path="t/:tripCode/shopping" element={<TripRouteGuard><ShoppingPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/dashboard" element={<TripRouteGuard><DashboardPage /></TripRouteGuard>} />
      </Route>
    </Routes>
  )
}
