// SPDX-License-Identifier: Apache-2.0
import './i18n'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { motion, AnimatePresence } from 'framer-motion'
import { AppRoutes } from './routes'
import { TripProvider } from './contexts/TripContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import { SessionHealthGate } from './components/SessionHealthGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useToast } from './hooks/use-toast'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

/** Listens for unhandled promise rejections and shows a toast */
function UnhandledErrorToaster() {
  const { toast } = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      toast({
        title: t('errors.unexpectedErrorTitle'),
        description: detail?.message ?? t('errors.unexpectedErrorDesc'),
        variant: 'destructive',
      })
    }
    window.addEventListener('spl1t:unhandled-error', handler)
    return () => window.removeEventListener('spl1t:unhandled-error', handler)
  }, [])

  return null
}

/** Birthday easter egg — self-removing after 2026-03-02 */
function BirthdayGreeting() {
  const { user } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user) return
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const d = today.getDate()
    const inWindow = y === 2026 && m === 2 && (d === 1 || d === 2)
    if (inWindow && user.id === '8f60570a-720f-417d-b093-e13a2c260001') {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [user])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={() => setVisible(false)}
          className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-sm cursor-pointer rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 shadow-lg"
        >
          <p className="text-2xl mb-1">🎂</p>
          <p className="font-semibold text-amber-900 text-base">Palju õnne, Raido!</p>
          <p className="text-amber-700 text-sm mt-1 leading-relaxed">
            Sünnipäeva puhul paneme kõik tänased kulud teistele :D
          </p>
          <p className="text-amber-600 text-xs mt-2 text-right italic">— Kristjan</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
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
                  <BirthdayGreeting />
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
