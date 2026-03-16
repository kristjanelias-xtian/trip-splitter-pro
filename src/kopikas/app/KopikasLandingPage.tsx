// SPDX-License-Identifier: Apache-2.0
import { useKopikasAuth } from './KopikasAuthProvider'
import { Pet } from '../components/Pet'
import { GoogleLogin } from '@react-oauth/google'
import { logger } from '@/lib/logger'
import { ScanLine, Heart, Users } from 'lucide-react'

export function KopikasLandingPage() {
  const { signInWithGoogle } = useKopikasAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6 px-4 flex justify-center pwa-safe-top">
        <img src="/kopikas-logo.png" alt="Kopikas" className="h-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
        <div className="mb-6">
          <Pet mood="ecstatic" level={5} size="lg" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">
          Lapse taskuraha, mänguliselt
        </h2>
        <p className="text-muted-foreground text-center mb-8">
          Kopikas aitab lapsel oma raha jälgida ja tarku otsuseid teha
        </p>

        <div className="w-full space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ScanLine size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Skanni kviitungeid</p>
              <p className="text-xs text-muted-foreground">AI tuvastab tooted ja kategoriseerib need automaatselt</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Heart size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Kasvata oma lemmikut</p>
              <p className="text-xs text-muted-foreground">Lemmik kasvab ja areneb koos heade rahaotsustega</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Vanema ülevaade</p>
              <p className="text-xs text-muted-foreground">Lisa taskuraha ja jälgi lapse kulutusi</p>
            </div>
          </div>
        </div>

        <GoogleLogin
          onSuccess={(response) => {
            if (response.credential) {
              signInWithGoogle(response.credential)
            }
          }}
          onError={() => {
            logger.error('Google Sign-In failed')
          }}
          size="large"
          theme="outline"
          text="signin_with"
        />

        <p className="text-xs text-muted-foreground text-center">
          Oled laps? Küsi oma linki vanemalt.
        </p>
      </main>
    </div>
  )
}
