import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSessionHealth } from '@/hooks/useSessionHealth'
import { StaleSessionOverlay } from '@/components/StaleSessionOverlay'

export function SessionHealthGate({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { isExpired, refresh } = useSessionHealth(session)

  return (
    <>
      {children}
      {isExpired && <StaleSessionOverlay onRefresh={refresh} />}
    </>
  )
}
