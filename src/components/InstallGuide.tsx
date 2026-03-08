// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { X, ChevronDown, Smartphone } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InstallGuideProps {
  variant: 'banner' | 'settings'
  onDismiss?: () => void
}

function IOSInstructions() {
  return (
    <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
      <li>
        Tap the <strong className="text-foreground">Share</strong> button
        (the box with the arrow) at the bottom of Safari
      </li>
      <li>
        Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong>
      </li>
      <li>
        Tap <strong className="text-foreground">"Add"</strong> — done!
      </li>
    </ol>
  )
}

function AndroidInstructions() {
  return (
    <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
      <li>
        Tap the <strong className="text-foreground">three dots</strong> (&#8942;)
        in Chrome's top-right corner
      </li>
      <li>
        Tap <strong className="text-foreground">"Add to Home screen"</strong>
      </li>
      <li>
        Tap <strong className="text-foreground">"Add"</strong> — done!
      </li>
    </ol>
  )
}

function GenericInstructions() {
  return (
    <p className="text-xs text-muted-foreground">
      Open your browser menu and look for{' '}
      <strong className="text-foreground">"Add to Home Screen"</strong> or{' '}
      <strong className="text-foreground">"Install app"</strong>.
    </p>
  )
}

function PlatformInstructions({ isIOS, isAndroid }: { isIOS: boolean; isAndroid: boolean }) {
  return (
    <div className="mt-3 space-y-3">
      {isIOS ? <IOSInstructions /> : isAndroid ? <AndroidInstructions /> : <GenericInstructions />}
      {(isIOS || isAndroid) && (
        <p className="text-xs text-muted-foreground/70 italic">
          Make sure you're on the home page when you do this, so the app
          always opens in the right place.
        </p>
      )}
    </div>
  )
}

export function InstallGuide({ variant, onDismiss }: InstallGuideProps) {
  const [expanded, setExpanded] = useState(false)
  const { isIOS, isAndroid } = usePWAInstall()

  if (variant === 'banner') {
    return (
      <div className="bg-muted/50 rounded-lg border border-border/50 p-3 mb-6">
        <div className="flex items-start gap-3">
          <Smartphone size={18} className="text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Open Spl1t like an app
              </p>
              <button
                onClick={onDismiss}
                aria-label="Dismiss"
                className="shrink-0 rounded-full w-6 h-6 flex items-center justify-center hover:bg-muted transition-colors -mt-0.5 -mr-0.5"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Open instantly from your phone — no browser needed
            </p>
            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-2 text-xs font-medium text-foreground hover:underline"
              >
                Show me
              </button>
            )}
            {expanded && (
              <PlatformInstructions isIOS={isIOS} isAndroid={isAndroid} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Settings variant — uses Card to match other ManageTripPage sections
  return (
    <Card>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full text-left"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-muted-foreground shrink-0" />
              <CardTitle>Open Spl1t like an app</CardTitle>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
          <CardDescription>Works like a regular app — no browser needed</CardDescription>
        </CardHeader>
      </button>
      {expanded && (
        <CardContent>
          <PlatformInstructions isIOS={isIOS} isAndroid={isAndroid} />
        </CardContent>
      )}
    </Card>
  )
}
