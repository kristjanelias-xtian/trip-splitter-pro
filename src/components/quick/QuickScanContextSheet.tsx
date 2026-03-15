// SPDX-License-Identifier: Apache-2.0
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
import type { Event } from '@/types/trip'

interface QuickScanContextSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trips: Event[]
  onNewGroup: () => void
}

export function QuickScanContextSheet({
  open,
  onOpenChange,
  trips,
  onNewGroup,
}: QuickScanContextSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSelectTrip = (tripCode: string) => {
    onOpenChange(false)
    navigate(`/t/${tripCode}/quick`, { state: { openScan: true } })
  }

  const handleNewGroup = () => {
    onOpenChange(false)
    onNewGroup()
  }

  return (
    <ResponsiveOverlay
      open={open}
      onClose={() => onOpenChange(false)}
      title={<span className="flex items-center gap-2"><ScanLine size={20} />{t('receipt.scanAReceipt')}</span>}
      headerExtra={
        <p className="text-sm text-muted-foreground px-4 pb-3">{t('quick.whichGroupForReceipt')}</p>
      }
    >
      <div className="space-y-2">
        {trips.map(trip => (
          <button
            key={trip.id}
            onClick={() => handleSelectTrip(trip.trip_code)}
            className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/40 transition-colors"
          >
            <span className="font-medium text-foreground">{trip.name}</span>
          </button>
        ))}

        {/* New Group option */}
        <Button
          variant="outline"
          className="w-full gap-2 mt-1"
          onClick={handleNewGroup}
        >
          <Plus size={16} />
          {t('quick.newGroup')}
        </Button>
      </div>
    </ResponsiveOverlay>
  )
}
