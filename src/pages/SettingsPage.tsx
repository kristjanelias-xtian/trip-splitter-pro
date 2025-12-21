import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Trash2, Info } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useMealContext } from '@/contexts/MealContext'
import { TripForm } from '@/components/TripForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { CreateTripInput } from '@/types/trip'

export function SettingsPage() {
  const { currentTrip, tripCode } = useCurrentTrip()
  const { updateTrip, deleteTrip } = useTripContext()
  const { participants } = useParticipantContext()
  const { meals } = useMealContext()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip selected. Please select a trip to view settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleEditTrip = async (values: CreateTripInput) => {
    setIsUpdating(true)
    try {
      const success = await updateTrip(currentTrip.id, {
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        tracking_mode: values.tracking_mode,
      })

      if (success) {
        setShowEditDialog(false)
        toast({
          title: 'Trip updated',
          description: 'Your trip details have been saved.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: 'Failed to update trip. Please try again.',
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while updating the trip.',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTrip = async () => {
    setIsDeleting(true)
    try {
      const success = await deleteTrip(currentTrip.id)

      if (success) {
        // Remove from localStorage
        const myTrips = JSON.parse(localStorage.getItem('myTrips') || '[]')
        const filtered = myTrips.filter((t: any) => t.id !== currentTrip.id)
        localStorage.setItem('myTrips', JSON.stringify(filtered))

        toast({
          title: 'Trip deleted',
          description: 'The trip has been permanently deleted.',
        })

        // Navigate to trips page
        navigate('/trips')
      } else {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: 'Failed to delete trip. Please try again.',
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while deleting the trip.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentTrip.name}</p>
      </div>

      {/* Trip Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Trip Details</CardTitle>
          <CardDescription>View and edit your trip information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Trip Name</Label>
              <p className="text-sm font-medium">{currentTrip.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Trip Code</Label>
              <p className="text-sm font-mono font-medium">{tripCode}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Start Date</Label>
              <p className="text-sm font-medium">
                {format(new Date(currentTrip.start_date), 'PPP')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">End Date</Label>
              <p className="text-sm font-medium">
                {format(new Date(currentTrip.end_date), 'PPP')}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tracking Mode</Label>
              <p className="text-sm font-medium capitalize">{currentTrip.tracking_mode}</p>
            </div>
          </div>
          <Button onClick={() => setShowEditDialog(true)} className="mt-4">
            <Edit size={16} className="mr-2" />
            Edit Trip Details
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 size={16} className="mr-2" />
                Delete Trip
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>"{currentTrip.name}"</strong> and all
                  associated data including expenses, settlements, meals, and shopping items.
                  <br />
                  <br />
                  <strong>This action cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTrip}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Trip'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Trip Details</DialogTitle>
            <DialogDescription>
              Update your trip name, dates, or tracking mode
            </DialogDescription>
          </DialogHeader>

          {/* Warning about meals */}
          {meals.length > 0 && (
            <Alert>
              <Info size={16} className="mt-0.5" />
              <AlertDescription>
                <strong>Note:</strong> Changing trip dates may hide meals that fall outside the
                new date range. Those meals will remain in the database.
              </AlertDescription>
            </Alert>
          )}

          <TripForm
            initialValues={{
              name: currentTrip.name,
              start_date: currentTrip.start_date,
              end_date: currentTrip.end_date,
              tracking_mode: currentTrip.tracking_mode,
            }}
            onSubmit={handleEditTrip}
            onCancel={() => setShowEditDialog(false)}
            submitLabel="Save Changes"
            isLoading={isUpdating}
            disableTrackingMode={participants.length > 0}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
