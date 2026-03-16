// SPDX-License-Identifier: Apache-2.0
import { useEffect, type ReactNode } from 'react'
import './kopikas-theme.css'

export function KopikasThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark', 'kopikas-theme')
    return () => {
      document.documentElement.classList.remove('kopikas-theme')
    }
  }, [])

  return <>{children}</>
}
