// SPDX-License-Identifier: Apache-2.0
import { useParams } from 'react-router-dom'
import { WalletProvider } from '../contexts/WalletContext'
import type { ReactNode } from 'react'

export function KopikasRouteGuard({ children }: { children: ReactNode }) {
  const { walletCode } = useParams<{ walletCode: string }>()

  if (!walletCode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-muted-foreground">Rahakotti ei leitud</p>
      </div>
    )
  }

  return <WalletProvider walletCode={walletCode}>{children}</WalletProvider>
}
