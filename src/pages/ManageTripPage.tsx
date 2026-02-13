import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Trash2, Info } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useMealContext } from '@/contexts/MealContext'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'
import { TripForm } from '@/components/TripForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export function ManageTripPage() {
  const { currentTrip, tripCode } = useCurrentTrip()
  const { updateTrip, deleteTrip } = useTripContext()
  const { participants } = useParticipantContext()
  const { meals } = useMealContext()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Currency settings state
  const ALL_CURRENCIES = ['EUR', 'USD', 'GBP', 'THB'] as const
  const [currencyDefault, setCurrencyDefault] = useState(currentTrip?.default_currency || 'EUR')
  const [exchangeRates, setExchangeRates] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(currentTrip?.exchange_rates || {}).map(([k, v]) => [k, String(v)])
    )
  )
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Manage Trip</h2>
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
        default_currency: values.default_currency,
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

  const handleSaveCurrencySettings = async () => {
    setIsSavingCurrency(true)
    try {
      const rates: Record<string, number> = {}
      for (const [currency, rateStr] of Object.entries(exchangeRates)) {
        if (currency !== currencyDefault) {
          const rate = parseFloat(rateStr)
          if (!isNaN(rate) && rate > 0) {
            rates[currency] = rate
          }
        }
      }

      const success = await updateTrip(currentTrip.id, {
        default_currency: currencyDefault,
        exchange_rates: rates,
      })

      if (success) {
        toast({
          title: 'Currency settings saved',
          description: 'Exchange rates have been updated.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description: 'Failed to save currency settings.',
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while saving currency settings.',
      })
    } finally {
      setIsSavingCurrency(false)
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

        // Navigate to home page
        navigate('/')
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Manage Trip</h2>
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

      {/* Currency Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Set your trip's default currency and exchange rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Select
              value={currencyDefault}
              onValueChange={(value) => {
                setCurrencyDefault(value)
                // Remove rate for the new default currency if it exists
                const newRates = { ...exchangeRates }
                delete newRates[value]
                setExchangeRates(newRates)
              }}
            >
              <SelectTrigger id="defaultCurrency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="THB">THB - Thai Baht</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              All balances and settlements will be displayed in this currency
            </p>
          </div>

          <div className="space-y-3">
            <Label>Exchange Rates</Label>
            <p className="text-xs text-muted-foreground">
              Set how much 1 {currencyDefault} equals in other currencies
            </p>
            {ALL_CURRENCIES.filter(c => c !== currencyDefault).map(currency => (
              <div key={currency} className="flex items-center gap-3">
                <Label className="w-32 text-sm text-muted-foreground shrink-0">
                  1 {currencyDefault} =
                </Label>
                <Input
                  type="number"
                  value={exchangeRates[currency] || ''}
                  onChange={(e) => setExchangeRates(prev => ({
                    ...prev,
                    [currency]: e.target.value,
                  }))}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-32"
                />
                <span className="text-sm font-medium">{currency}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveCurrencySettings}
            disabled={isSavingCurrency}
          >
            {isSavingCurrency ? 'Saving...' : 'Save Currency Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Participants Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Participants & Families
        </h3>
        {currentTrip.tracking_mode === 'individuals' ? (
          <IndividualsSetup />
        ) : (
          <FamiliesSetup />
        )}
      </div>

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
              default_currency: currentTrip.default_currency,
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
