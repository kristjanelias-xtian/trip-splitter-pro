import { muteTrip } from '@/lib/mutedTripsStorage'
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
import { VolumeX, LogOut } from 'lucide-react'

interface GroupActionsProps {
  tripCode: string
  tripName: string
  onMuted?: () => void
  onLeft?: () => void
}

export function GroupActions({ tripCode, tripName, onMuted, onLeft }: GroupActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={() => {
          muteTrip(tripCode)
          onMuted?.()
        }}
      >
        <VolumeX size={14} />
        Mute
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <LogOut size={14} />
            Leave
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave "{tripName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the trip from your list. You can rejoin later via the share link.
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
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
