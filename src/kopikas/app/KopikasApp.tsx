// SPDX-License-Identifier: Apache-2.0
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { KopikasAuthProvider } from './KopikasAuthProvider'
import { KopikasThemeProvider } from './KopikasThemeProvider'
import { KopikasAppRoutes } from './KopikasAppRoutes'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export function KopikasApp() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ErrorBoundary>
          <KopikasAuthProvider>
            <KopikasThemeProvider>
              <KopikasAppRoutes />
            </KopikasThemeProvider>
          </KopikasAuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
