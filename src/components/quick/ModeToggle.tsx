// SPDX-License-Identifier: Apache-2.0
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { Zap, LayoutGrid } from 'lucide-react'

interface ModeToggleProps {
  onGradient?: boolean
}

export function ModeToggle({ onGradient = false }: ModeToggleProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { tripCode } = useParams<{ tripCode: string }>()
  const { mode, setMode } = useUserPreferences()

  // If the user is on a quick route (e.g. mobile redirect overrode a stored
  // 'full' preference), the toggle should reflect where they actually are.
  const isOnQuickRoute = location.pathname.includes('/quick')
  const isOnFullTripRoute = !isOnQuickRoute && /\/t\/[^/]+\//.test(location.pathname)
  const effectiveMode = isOnQuickRoute ? 'quick' : isOnFullTripRoute ? 'full' : mode

  const handleToggle = async () => {
    const newMode = effectiveMode === 'quick' ? 'full' : 'quick'
    await setMode(newMode)

    // Navigate to the appropriate view only when inside a trip
    if (tripCode) {
      if (newMode === 'quick') {
        navigate(`/t/${tripCode}/quick`)
      } else {
        navigate(`/t/${tripCode}/dashboard`)
      }
    }
    // On home page (no tripCode): just update preference, no navigation needed
  }

  const buttonClass = onGradient
    ? 'border-white/40 bg-white/15 hover:bg-white/25 text-white'
    : 'border-primary/40 bg-primary/10 hover:bg-primary/15 text-primary'

  // Show the opposite mode — clicking navigates to it
  const Icon = effectiveMode === 'quick' ? LayoutGrid : Zap
  const label = effectiveMode === 'quick' ? 'Full view' : 'Quick view'

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${buttonClass}`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
