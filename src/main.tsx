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
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
