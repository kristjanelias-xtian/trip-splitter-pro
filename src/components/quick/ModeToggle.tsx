import { useNavigate, useParams } from 'react-router-dom'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { Zap, Settings2 } from 'lucide-react'

export function ModeToggle() {
  const navigate = useNavigate()
  const { tripCode } = useParams<{ tripCode: string }>()
  const { mode, setMode } = useUserPreferences()

  const handleModeChange = async (newMode: 'quick' | 'full') => {
    if (newMode === mode) return
    await setMode(newMode)

    // Navigate to the appropriate view
    if (newMode === 'quick') {
      if (tripCode) {
        navigate(`/t/${tripCode}/quick`)
      } else {
        navigate('/quick')
      }
    } else {
      // Full mode
      if (tripCode) {
        navigate(`/t/${tripCode}/dashboard`)
      } else {
        navigate('/')
      }
    }
  }

  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5">
      <button
        onClick={() => handleModeChange('quick')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          mode === 'quick'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Zap size={14} />
        Quick
      </button>
      <button
        onClick={() => handleModeChange('full')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          mode === 'full'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Settings2 size={14} />
        Full
      </button>
    </div>
  )
}
