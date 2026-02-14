import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

interface UserMenuProps {
  onGradient?: boolean
}

export function UserMenu({ onGradient = false }: UserMenuProps) {
  const { user, userProfile, signOut } = useAuth()

  if (!user) return null

  const displayName = userProfile?.display_name || user.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`gap-2 px-2 ${onGradient ? 'hover:bg-white/10' : ''}`}>
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt={displayName}
              className={`w-7 h-7 rounded-full ${onGradient ? 'ring-2 ring-white/30' : ''}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              onGradient
                ? 'bg-white/20 text-white'
                : 'bg-primary/10 text-primary'
            }`}>
              {initials}
            </div>
          )}
          <span className={`hidden sm:inline text-sm font-medium max-w-[120px] truncate ${
            onGradient ? 'text-white' : ''
          }`}>
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{displayName}</p>
          {(userProfile?.email || user.email) && (
            <p className="text-xs text-muted-foreground">{userProfile?.email || user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive focus:text-destructive">
          <LogOut size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
