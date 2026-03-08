import { Sun, Monitor, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

const options = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
]

interface ThemeToggleProps {
  size?: 'default' | 'compact'
  iconOnly?: boolean
}

export function ThemeToggle({ size = 'default', iconOnly = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const isCompact = size === 'compact'

  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-1 gap-1 w-fit">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={`flex items-center gap-1.5 rounded-md transition-colors ${
            isCompact ? 'px-2 py-1' : 'px-3 py-1.5'
          } ${
            theme === value
              ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon size={isCompact ? 14 : 16} />
          {!iconOnly && <span className="text-xs font-medium">{label}</span>}
        </button>
      ))}
    </div>
  )
}
