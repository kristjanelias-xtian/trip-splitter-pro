// SPDX-License-Identifier: Apache-2.0
import { useState, useCallback } from 'react'

const DISMISSED_KEY = 'spl1t:install-prompt-dismissed'
const VISITS_KEY = 'spl1t:visit-count'

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function readInt(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0
  } catch {
    return 0
  }
}

export function usePWAInstall() {
  // Is the app already running installed (standalone)?
  const isInstalled =
    ('standalone' in navigator &&
      (navigator as unknown as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches

  // Has the user dismissed the prompt before?
  const [isDismissed, setIsDismissed] = useState(() => readBool(DISMISSED_KEY))

  // Is this a mobile device? Use userAgent — viewport width unreliable at init
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  // Platform detection for instructions
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  const isAndroid = /Android/i.test(navigator.userAgent)

  // Engagement: visit count
  const visitCount = readInt(VISITS_KEY)
  const isEngaged = visitCount >= 2

  const incrementVisit = useCallback(() => {
    try {
      const current = readInt(VISITS_KEY)
      localStorage.setItem(VISITS_KEY, String(current + 1))
    } catch {
      // localStorage unavailable — silently ignore
    }
  }, [])

  // Show banner on home page: mobile + not installed + not dismissed + engaged
  const shouldShowPrompt =
    isMobile && !isInstalled && !isDismissed && isEngaged

  // Show in Manage Trip: mobile + not installed (regardless of dismissal)
  const shouldShowInSettings = isMobile && !isInstalled

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // localStorage unavailable — silently ignore
    }
    setIsDismissed(true)
  }, [])

  return {
    isInstalled,
    isDismissed,
    isMobile,
    isIOS,
    isAndroid,
    shouldShowPrompt,
    shouldShowInSettings,
    incrementVisit,
    dismiss,
  }
}
