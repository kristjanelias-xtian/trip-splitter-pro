import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'
import { AuthProvider } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { SessionHealthGate } from './components/SessionHealthGate'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AuthProvider>
          <SessionHealthGate>
            <TripProvider>
              <UserPreferencesProvider>
                <AppRoutes />
              </UserPreferencesProvider>
            </TripProvider>
          </SessionHealthGate>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App
