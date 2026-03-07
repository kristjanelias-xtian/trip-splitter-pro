import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const DISMISS_KEY = 'spl1t:dismiss-bank-details'

export function useBankDetailsPrompt() {
  const { user, userProfile } = useAuth()

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const hasBankDetails = !!(userProfile?.bank_account_holder || userProfile?.bank_iban)

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }, [])

  /** For dismissible nudge cards — authenticated + no bank details + not dismissed + owed money */
  const shouldShowNudge = useCallback(
    (isOwedMoney: boolean) => !!user && !hasBankDetails && !dismissed && isOwedMoney,
    [user, hasBankDetails, dismissed]
  )

  /** For settlement sheet — authenticated + no bank details (never dismissible) */
  const shouldShowActionLink = !!user && !hasBankDetails

  return { shouldShowNudge, shouldShowActionLink, dialogOpen, setDialogOpen, dismiss }
}
