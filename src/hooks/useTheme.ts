// SPDX-License-Identifier: Apache-2.0
import { useCallback, useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'spl1t:theme'
const DARK_BG = '#1A1A2E'
const LIGHT_BG = '#e8613a'

// Module-level shared state
let currentTheme: Theme = getStoredTheme()
const listeners = new Set<() => void>()

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : theme
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Update theme-color meta tags
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  metas.forEach(meta => {
    const media = meta.getAttribute('media')
    if (!media) {
      // Legacy single tag — update directly
      meta.setAttribute('content', resolved === 'dark' ? DARK_BG : LIGHT_BG)
    }
  })
}

function notifyListeners() {
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Theme {
  return currentTheme
}

// Listen for system preference changes (module-level, runs once)
if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  mql.addEventListener('change', (e) => {
    if (currentTheme === 'system') {
      applyTheme(e.matches ? 'dark' : 'light')
      // Notify listeners to re-render with new resolvedTheme
      notifyListeners()
    }
  })
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot)

  const resolvedTheme = resolveTheme(theme)

  const setTheme = useCallback((newTheme: Theme) => {
    currentTheme = newTheme
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {}
    applyTheme(resolveTheme(newTheme))
    notifyListeners()
  }, [])

  // Apply on mount
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { theme, setTheme, resolvedTheme }
}
