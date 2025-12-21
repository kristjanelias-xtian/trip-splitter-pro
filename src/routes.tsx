import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TripRouteGuard } from './components/TripRouteGuard'
import { HomePage } from './pages/HomePage'
import { TripsPage } from './pages/TripsPage'
import { ManageTripPage } from './pages/ManageTripPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { MealsPage } from './pages/MealsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettlementsPage } from './pages/SettlementsPage'
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

        {/* Trip routes - protected by TripRouteGuard */}
        {/* Redirect base trip URL to dashboard */}
        <Route path="t/:tripCode" element={<Navigate to="dashboard" replace />} />
        <Route path="t/:tripCode/manage" element={<TripRouteGuard><ManageTripPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/expenses" element={<TripRouteGuard><ExpensesPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/settlements" element={<TripRouteGuard><SettlementsPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/meals" element={<TripRouteGuard><MealsPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/shopping" element={<TripRouteGuard><ShoppingPage /></TripRouteGuard>} />
        <Route path="t/:tripCode/dashboard" element={<TripRouteGuard><DashboardPage /></TripRouteGuard>} />
      </Route>
    </Routes>
  )
}
