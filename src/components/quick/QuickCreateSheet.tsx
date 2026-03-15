// SPDX-License-Identifier: Apache-2.0
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTripContext } from '@/contexts/TripContext'
import { EventForm } from '@/components/EventForm'
import { CreateEventInput } from '@/types/trip'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'

interface QuickCreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCreateSheet({ open, onOpenChange }: QuickCreateSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { createTrip } = useTripContext()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const handleCreate = async (input: CreateEventInput) => {
    const newEvent = await createTrip(input)
    if (newEvent) {
      onOpenChange(false)
      navigate(isMobile ? `/t/${newEvent.trip_code}/quick` : `/t/${newEvent.trip_code}/manage`)
    }
  }

  return (
    <ResponsiveOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('quick.createNew')}
      hasInputs
      scrollClassName="px-6 py-4"
    >
      <EventForm
        onSubmit={handleCreate}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveOverlay>
  )
}
