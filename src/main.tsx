import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

window.addEventListener('error', (event) => {
  import('@/lib/logger').then(({ logger }) => {
    logger.error('Unhandled window error', {
      errorMessage: event.message,
      filename: event.filename,
      lineno: event.lineno,
      errorName: event.error?.name,
    })
  }).catch(() => {})
})

window.addEventListener('unhandledrejection', (event) => {
  import('@/lib/logger').then(({ logger }) => {
    const reason = event.reason
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      reasonName: reason instanceof Error ? reason.name : undefined,
    })
  }).catch(() => {})

  // Dispatch custom event for top-level toast (React context not available here)
  window.dispatchEvent(new CustomEvent('spl1t:unhandled-error', {
    detail: { message: event.reason?.message ?? 'An unexpected error occurred' }
  }))
})

// PWA home screen launch guard
// Fallback for when the service worker does not intercept the initial
// navigation (common on iOS). If launched in standalone mode into a
// trip route, redirect to home page immediately before React renders.
const isStandalone =
  ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true) ||
  window.matchMedia('(display-mode: standalone)').matches

if (isStandalone && window.location.pathname.startsWith('/t/')) {
  window.location.replace('/')
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
