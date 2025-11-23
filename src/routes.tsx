import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TripsPage } from './pages/TripsPage'
import { TripSetupPage } from './pages/TripSetupPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { MealsPage } from './pages/MealsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettlementsPage } from './pages/SettlementsPage'
import { SettingsPage } from './pages/SettingsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<TripsPage />} />
        {/* Trip routes using shareable trip codes */}
        <Route path="t/:tripCode/setup" element={<TripSetupPage />} />
        <Route path="t/:tripCode/expenses" element={<ExpensesPage />} />
        <Route path="t/:tripCode/settlements" element={<SettlementsPage />} />
        <Route path="t/:tripCode/meals" element={<MealsPage />} />
        <Route path="t/:tripCode/shopping" element={<ShoppingPage />} />
        <Route path="t/:tripCode/dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
