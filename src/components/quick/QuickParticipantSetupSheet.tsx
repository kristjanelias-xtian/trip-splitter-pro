// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { ParticipantsSetup } from '@/components/setup/ParticipantsSetup'
import { Button } from '@/components/ui/button'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'

interface QuickParticipantSetupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickParticipantSetupSheet({ open, onOpenChange }: QuickParticipantSetupSheetProps) {
  const { t } = useTranslation()
  const { currentTrip } = useCurrentTrip()

  if (!currentTrip) return null

  return (
    <ResponsiveOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('quick.setupGroup')}
      hasInputs
      headerExtra={
        <p className="text-sm text-muted-foreground px-4 pb-3 mt-0">{t('quick.addPeopleSharingCosts')}</p>
      }
      footer={
        <Button className="w-full" onClick={() => onOpenChange(false)}>
          {t('common.done')}
        </Button>
      }
      scrollClassName="px-6 py-4 space-y-4"
    >
      <ParticipantsSetup />
    </ResponsiveOverlay>
  )
}
