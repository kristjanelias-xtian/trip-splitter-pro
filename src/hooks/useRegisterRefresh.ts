// SPDX-License-Identifier: Apache-2.0
import { useEffect } from 'react'
import { usePullToRefreshContext } from '@/contexts/PullToRefreshContext'

export function useRegisterRefresh(onRefresh: () => Promise<void>) {
  const { registerRefresh, unregisterRefresh } = usePullToRefreshContext()

  useEffect(() => {
    registerRefresh(onRefresh)
    return () => unregisterRefresh(onRefresh)
  }, [onRefresh, registerRefresh, unregisterRefresh])
}
