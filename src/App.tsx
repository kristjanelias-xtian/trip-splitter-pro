import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'
import { AuthProvider } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { SessionHealthGate } from './components/SessionHealthGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useToast } from './hooks/use-toast'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/** Listens for unhandled promise rejections and shows a toast */
function UnhandledErrorToaster() {
  const { toast } = useToast()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      toast({
        title: 'Unexpected error',
        description: detail?.message ?? 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
    window.addEventListener('spl1t:unhandled-error', handler)
    return () => window.removeEventListener('spl1t:unhandled-error', handler)
  }, [])

  return null
}

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <SessionHealthGate>
              <TripProvider>
                <UserPreferencesProvider>
                  <UnhandledErrorToaster />
                  <AppRoutes />
                </UserPreferencesProvider>
              </TripProvider>
            </SessionHealthGate>
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App
