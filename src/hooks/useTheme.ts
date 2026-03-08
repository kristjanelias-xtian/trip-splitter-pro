// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'spl1t:theme'
const DARK_BG = '#1A1A2E'
const LIGHT_BG = '#e8613a'

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

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (getSystemPrefersDark() ? 'dark' : 'light') : theme

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {}
    const resolved = newTheme === 'system'
      ? (getSystemPrefersDark() ? 'dark' : 'light')
      : newTheme
    applyTheme(resolved)
  }, [])

  // Apply on mount
  useEffect(() => {
    applyTheme(resolvedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light')
        // Force re-render so resolvedTheme updates
        setThemeState('system')
      }
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [theme])

  return { theme, setTheme, resolvedTheme }
}
