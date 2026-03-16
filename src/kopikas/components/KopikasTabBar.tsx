// SPDX-License-Identifier: Apache-2.0
import { NavLink, useParams } from 'react-router-dom'
import { usePet } from '../hooks/usePet'

export function KopikasTabBar() {
  const { walletCode } = useParams<{ walletCode: string }>()
  const { pet } = usePet()
  const base = `/kopikas/${walletCode}`
  const petLabel = pet?.name || 'Kopikas'
  const petEmoji = pet?.starter_emoji || '🫧'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pwa-safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        <TabLink to={base} end label="Kodu" emoji="🏠" />
        <TabLink to={`${base}/analytics`} label="Ülevaade" emoji="📊" />
        <TabLink to={`${base}/pet`} label={petLabel} emoji={petEmoji} />
      </div>
    </nav>
  )
}

function TabLink({ to, label, emoji, end }: { to: string; label: string; emoji: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
          isActive ? 'text-foreground' : 'text-muted-foreground'
        }`
      }
    >
      <span className="text-lg">{emoji}</span>
      <span>{label}</span>
    </NavLink>
  )
}
