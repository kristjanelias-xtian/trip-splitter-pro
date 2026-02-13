import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'
import { AuthProvider } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TripProvider>
          <UserPreferencesProvider>
            <AppRoutes />
          </UserPreferencesProvider>
        </TripProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
