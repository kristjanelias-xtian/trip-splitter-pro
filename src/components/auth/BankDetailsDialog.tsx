import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface BankDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BankDetailsDialog({ open, onOpenChange }: BankDetailsDialogProps) {
  const { userProfile, updateBankDetails } = useAuth()
  const { toast } = useToast()

  const [holder, setHolder] = useState(userProfile?.bank_account_holder || '')
  const [iban, setIban] = useState(userProfile?.bank_iban || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBankDetails(holder.trim(), iban.trim())
      toast({
        title: 'Bank details saved',
        description: 'Your bank details have been updated.',
      })
      onOpenChange(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save bank details.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bank Details</DialogTitle>
          <DialogDescription>
            Add your bank details so others can see where to send payments in settlement plans.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="accountHolder">Account Holder Name</Label>
            <Input
              id="accountHolder"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="e.g., John Smith"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="e.g., DE89 3704 0044 0532 0130 00"
              disabled={saving}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
