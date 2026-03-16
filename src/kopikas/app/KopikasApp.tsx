// SPDX-License-Identifier: Apache-2.0
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { KopikasAuthProvider } from './KopikasAuthProvider'
import { KopikasThemeProvider } from './KopikasThemeProvider'
import { KopikasAppRoutes } from './KopikasAppRoutes'

export function KopikasApp() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <KopikasAuthProvider>
          <KopikasThemeProvider>
            <KopikasAppRoutes />
          </KopikasThemeProvider>
        </KopikasAuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
