import { useState } from 'react'
import { X, LogIn, Landmark } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { SignInButton } from '@/components/auth/SignInButton'
import { BankDetailsDialog } from '@/components/auth/BankDetailsDialog'
import { Button } from '@/components/ui/button'

const LOGIN_DISMISS_KEY = 'split-dismiss-login-prompt'
const BANK_DETAILS_DISMISS_KEY = 'split-dismiss-bank-details-prompt'

export function OnboardingPrompts() {
  const { user, userProfile, loading } = useAuth()
  const [loginDismissed, setLoginDismissed] = useState(
    () => localStorage.getItem(LOGIN_DISMISS_KEY) === 'true'
  )
  const [bankDetailsDismissed, setBankDetailsDismissed] = useState(
    () => localStorage.getItem(BANK_DETAILS_DISMISS_KEY) === 'true'
  )
  const [showBankDialog, setShowBankDialog] = useState(false)

  // Don't render anything while auth is loading to avoid flash
  if (loading) return null

  // Login prompt for unauthenticated users
  if (!user && !loginDismissed) {
    return (
      <div className="mb-6 p-4 rounded-lg border border-border bg-accent/30 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <LogIn size={20} className="text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Sign in for a better experience</p>
            <p className="text-xs text-muted-foreground mb-3">
              Quick Mode for faster expense entry, bank details in settlement plans, and link yourself to trips across devices.
            </p>
            <SignInButton type="standard" />
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(LOGIN_DISMISS_KEY, 'true')
            setLoginDismissed(true)
          }}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  // Bank details prompt for authenticated users without bank details
  const hasBankDetails = userProfile?.bank_account_holder || userProfile?.bank_iban
  if (user && !hasBankDetails && !bankDetailsDismissed) {
    return (
      <>
        <div className="mb-6 p-4 rounded-lg border border-border bg-accent/30 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Landmark size={20} className="text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Add your bank details</p>
              <p className="text-xs text-muted-foreground mb-3">
                Others will see your account info in settlement plans, making it easy to send payments.
              </p>
              <Button size="sm" onClick={() => setShowBankDialog(true)}>
                Add Bank Details
              </Button>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(BANK_DETAILS_DISMISS_KEY, 'true')
              setBankDetailsDismissed(true)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
        <BankDetailsDialog open={showBankDialog} onOpenChange={setShowBankDialog} />
      </>
    )
  }

  return null
}
