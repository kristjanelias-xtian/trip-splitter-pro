// SPDX-License-Identifier: Apache-2.0
import { GoogleLogin } from '@react-oauth/google'
import { useKopikasAuth } from '../app/KopikasAuthProvider'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { logger } from '@/lib/logger'

interface KopikasSignInButtonProps {
  type?: 'icon' | 'standard'
}

export function KopikasSignInButton({ type = 'standard' }: KopikasSignInButtonProps) {
  const { signInWithGoogle, signInWithRedirect } = useKopikasAuth()
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Mobile/PWA: GoogleLogin popups don't work on iOS Safari — use OAuth redirect
  if (isMobile) {
    if (type === 'icon') {
      return (
        <button
          onClick={signInWithRedirect}
          className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Logi sisse"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </button>
      )
    }

    return (
      <button
        onClick={signInWithRedirect}
        className="flex items-center gap-3 px-6 py-3 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        <span className="font-medium">Logi sisse Google'iga</span>
      </button>
    )
  }

  // Desktop: use GoogleLogin component (shows app domain on consent screen)
  return (
    <GoogleLogin
      onSuccess={(response) => {
        if (response.credential) {
          signInWithGoogle(response.credential)
        }
      }}
      onError={() => {
        logger.error('Google Sign-In failed')
      }}
      size={type === 'icon' ? 'medium' : 'large'}
      type={type}
      shape={type === 'icon' ? 'circle' : undefined}
      theme="outline"
      text="signin_with"
    />
  )
}
