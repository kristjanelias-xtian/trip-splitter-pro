// SPDX-License-Identifier: Apache-2.0
import { useKopikasAuth } from '../app/KopikasAuthProvider'
import { KopikasSignInButton } from './KopikasSignInButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

export function KopikasUserMenu() {
  const { user, signOut } = useKopikasAuth()

  if (!user) {
    return <KopikasSignInButton type="icon" />
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Kasutaja'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors overflow-hidden"
          aria-label="Kasutaja menüü"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary text-xs font-medium">
              {initials}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{displayName}</p>
          {user.email && (
            <p className="text-xs text-muted-foreground">{user.email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => { signOut() }} className="gap-2 text-destructive focus:text-destructive">
          <LogOut size={16} />
          Logi välja
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
