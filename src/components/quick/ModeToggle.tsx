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

  const handleModeChange = async (newMode: 'quick' | 'full') => {
    if (newMode === effectiveMode) return
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

  const containerClass = onGradient
    ? 'flex items-center bg-white/20 rounded-lg p-0.5'
    : 'flex items-center bg-muted rounded-lg p-0.5'

  const activeClass = onGradient
    ? 'bg-white/30 text-white shadow-sm'
    : 'bg-background text-foreground shadow-sm'

  const inactiveClass = onGradient
    ? 'text-white/70 hover:text-white'
    : 'text-muted-foreground hover:text-foreground'

  return (
    <div className={containerClass}>
      <button
        onClick={() => handleModeChange('quick')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          effectiveMode === 'quick' ? activeClass : inactiveClass
        }`}
      >
        <Zap size={14} />
        Quick
      </button>
      <button
        onClick={() => handleModeChange('full')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          effectiveMode === 'full' ? activeClass : inactiveClass
        }`}
      >
        <LayoutGrid size={14} />
        Full
      </button>
    </div>
  )
}
