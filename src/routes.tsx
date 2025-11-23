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
        <Route path="trip-setup" element={<TripSetupPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="shopping" element={<ShoppingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
