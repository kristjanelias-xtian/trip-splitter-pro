// SPDX-License-Identifier: Apache-2.0
import { NavLink, useParams } from 'react-router-dom'
import { usePet } from '../hooks/usePet'
import { Home, BarChart3, Heart, type LucideIcon } from 'lucide-react'

export function KopikasTabBar() {
  const { walletCode } = useParams<{ walletCode: string }>()
  const { pet } = usePet()
  const base = `/kopikas/${walletCode}`
  const petLabel = pet?.name || 'Kopikas'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background pwa-safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        <TabLink to={base} end label="Kodu" icon={Home} />
        <TabLink to={`${base}/analytics`} label="Ülevaade" icon={BarChart3} />
        <TabLink to={`${base}/pet`} label={petLabel} icon={Heart} />
      </div>
    </nav>
  )
}

function TabLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: LucideIcon; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
          isActive ? 'text-primary' : 'text-muted-foreground'
        }`
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  )
}
