import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TripsPage } from './pages/TripsPage'
import { TripSetupPage } from './pages/TripSetupPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { MealsPage } from './pages/MealsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<TripsPage />} />
        <Route path="trips/:tripId/setup" element={<TripSetupPage />} />
        <Route path="trips/:tripId/expenses" element={<ExpensesPage />} />
        <Route path="trips/:tripId/meals" element={<MealsPage />} />
        <Route path="trips/:tripId/shopping" element={<ShoppingPage />} />
        <Route path="trips/:tripId/dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
