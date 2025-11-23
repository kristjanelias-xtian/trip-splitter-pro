import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TripRouteGuard } from './components/TripRouteGuard'
import { HomePage } from './pages/HomePage'
import { TripsPage } from './pages/TripsPage'
import { TripSetupPage } from './pages/TripSetupPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { MealsPage } from './pages/MealsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AdminAllTripsPage } from './pages/AdminAllTripsPage'
import { TripNotFoundPage } from './pages/TripNotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* Special routes - outside Layout */}
      <Route path="admin/all-trips" element={<AdminAllTripsPage />} />
      <Route path="trip-not-found/:tripCode" element={<TripNotFoundPage />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="create-trip" element={<TripsPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Trip routes - protected by TripRouteGuard */}
        <Route path="t/:tripCode/setup" element={<TripRouteGuard><TripSetupPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/expenses" element={<TripRouteGuard><ExpensesPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/settlements" element={<TripRouteGuard><SettlementsPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/meals" element={<TripRouteGuard><MealsPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/shopping" element={<TripRouteGuard><ShoppingPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/dashboard" element={<TripRouteGuard><DashboardPage /></TripRouteGuard>} />
      </Route>
    </Routes>
  )
}
