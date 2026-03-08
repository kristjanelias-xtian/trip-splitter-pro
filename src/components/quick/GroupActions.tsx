// SPDX-License-Identifier: Apache-2.0
import { hideTrip } from '@/lib/mutedTripsStorage'
import { removeFromMyTrips } from '@/lib/myTripsStorage'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { EyeOff, X } from 'lucide-react'

interface GroupActionsProps {
  tripCode: string
  tripName: string
  showRemove?: boolean
  onHidden?: () => void
  onLeft?: () => void
}

export function GroupActions({ tripCode, tripName, showRemove, onHidden, onLeft }: GroupActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => {
          hideTrip(tripCode)
          onHidden?.()
        }}
      >
        <EyeOff size={14} />
        Hide
      </Button>

      {showRemove && <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <X size={14} />
            Remove
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{tripName}" from your list?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the trip from your home page. Your expenses and data stay intact, and you can rejoin anytime via the share link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeFromMyTrips(tripCode)
                onLeft?.()
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </div>
  )
}
