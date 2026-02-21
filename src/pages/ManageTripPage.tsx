import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Trash2, Info, X, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useMealContext } from '@/contexts/MealContext'
import { IndividualsSetup } from '@/components/setup/IndividualsSetup'
import { FamiliesSetup } from '@/components/setup/FamiliesSetup'
import { EventForm } from '@/components/EventForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { CreateEventInput } from '@/types/trip'
import { StaySection } from '@/components/StaySection'

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
  const [currencyDefault, setCurrencyDefault] = useState(currentTrip?.default_currency || 'EUR')
  const [currencyRows, setCurrencyRows] = useState<{ code: string; rate: string }[]>(
    Object.entries(currentTrip?.exchange_rates || {}).map(([k, v]) => ({ code: k, rate: String(v) }))
  )
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)

  // Feature toggle state - track which features are currently being toggled
  const [togglingFeatures, setTogglingFeatures] = useState<Set<string>>(new Set())

  if (!currentTrip) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Manage</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              No trip or event selected.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const entityLabel = currentTrip.event_type === 'event' ? 'Event' : 'Trip'
  const isEvent = currentTrip.event_type === 'event'

  const handleEditTrip = async (values: CreateEventInput) => {
    setIsUpdating(true)
    try {
      const success = await updateTrip(currentTrip.id, {
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        event_type: values.event_type,
        tracking_mode: values.tracking_mode,
        default_currency: values.default_currency,
      })

      if (success) {
        setShowEditDialog(false)
        toast({
          title: `${entityLabel} updated`,
          description: 'Your details have been saved.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: `Failed to update ${entityLabel.toLowerCase()}. Please try again.`,
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `An error occurred while updating the ${entityLabel.toLowerCase()}.`,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const featureLabels: Record<string, string> = {
    enable_meals: 'Meal planning',
    enable_activities: 'Activity planning',
    enable_shopping: 'Shopping list',
    default_split_all: 'Split between everyone',
  }

  const handleToggleFeature = async (feature: 'enable_meals' | 'enable_activities' | 'enable_shopping' | 'default_split_all', value: boolean) => {
    setTogglingFeatures(prev => new Set(prev).add(feature))
    try {
      const success = await updateTrip(currentTrip.id, { [feature]: value })
      if (success) {
        toast({
          title: 'Feature updated',
          description: `${featureLabels[feature]} ${value ? 'enabled' : 'disabled'}.`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: 'Failed to update feature toggle.',
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while updating the feature.',
      })
    } finally {
      setTogglingFeatures(prev => { const next = new Set(prev); next.delete(feature); return next })
    }
  }

  const handleSaveCurrencySettings = async () => {
    setIsSavingCurrency(true)
    try {
      const rates: Record<string, number> = {}
      for (const row of currencyRows) {
        const code = row.code.trim().toUpperCase()
        if (code && code !== currencyDefault) {
          const rate = parseFloat(row.rate)
          if (!isNaN(rate) && rate > 0) {
            rates[code] = rate
          }
        }
      }

      const success = await updateTrip(currentTrip.id, {
        default_currency: currencyDefault.trim().toUpperCase() || 'EUR',
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
          title: `${entityLabel} deleted`,
          description: `The ${entityLabel.toLowerCase()} has been permanently deleted.`,
        })

        // Navigate to home page
        navigate('/')
      } else {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: `Failed to delete ${entityLabel.toLowerCase()}. Please try again.`,
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `An error occurred while deleting the ${entityLabel.toLowerCase()}.`,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Manage {entityLabel}</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentTrip.name}</p>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{entityLabel} Details</CardTitle>
          <CardDescription>View and edit your {entityLabel.toLowerCase()} information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="text-sm font-medium">{currentTrip.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Code</Label>
              <p className="text-sm font-mono font-medium">{tripCode}</p>
            </div>
            {isEvent ? (
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p className="text-sm font-medium">
                  {format(new Date(currentTrip.start_date), 'PPP')}
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
            <div>
              <Label className="text-muted-foreground">Tracking Mode</Label>
              <p className="text-sm font-medium capitalize">{currentTrip.tracking_mode}</p>
            </div>
          </div>
          <Button onClick={() => setShowEditDialog(true)} className="mt-4">
            <Edit size={16} className="mr-2" />
            Edit Details
          </Button>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Enable or disable optional features for this {entityLabel.toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Meal Planning</Label>
              <p className="text-xs text-muted-foreground">Plan meals for each day</p>
            </div>
            <Switch
              checked={currentTrip.enable_meals}
              onCheckedChange={(checked) => handleToggleFeature('enable_meals', checked)}
              disabled={togglingFeatures.has('enable_meals')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Activity Planning</Label>
              <p className="text-xs text-muted-foreground">Plan activities for each day</p>
            </div>
            <Switch
              checked={currentTrip.enable_activities}
              onCheckedChange={(checked) => handleToggleFeature('enable_activities', checked)}
              disabled={togglingFeatures.has('enable_activities')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Shopping List</Label>
              <p className="text-xs text-muted-foreground">Collaborative shopping list with real-time updates</p>
            </div>
            <Switch
              checked={currentTrip.enable_shopping}
              onCheckedChange={(checked) => handleToggleFeature('enable_shopping', checked)}
              disabled={togglingFeatures.has('enable_shopping')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Split Between Everyone</Label>
              <p className="text-xs text-muted-foreground">New expenses default to splitting between all participants</p>
            </div>
            <Switch
              checked={currentTrip.default_split_all ?? true}
              onCheckedChange={(checked) => handleToggleFeature('default_split_all', checked)}
              disabled={togglingFeatures.has('default_split_all')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Set the default currency and exchange rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default Currency</Label>
            <Input
              id="defaultCurrency"
              value={currencyDefault}
              onChange={(e) => setCurrencyDefault(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="EUR"
              maxLength={3}
              className="w-32 uppercase"
            />
            <p className="text-xs text-muted-foreground">
              All balances and settlements will be displayed in this currency
            </p>
          </div>

          <div className="space-y-3">
            <Label>Exchange Rates</Label>
            <p className="text-xs text-muted-foreground">
              Set how much 1 {currencyDefault || '...'} equals in other currencies
            </p>
            {currencyRows.map((row, index) => (
              <div key={index} className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground shrink-0">
                  1 {currencyDefault || '...'} =
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={row.rate}
                  onChange={(e) => {
                    const updated = [...currencyRows]
                    updated[index] = { ...updated[index], rate: e.target.value.replace(',', '.') }
                    setCurrencyRows(updated)
                  }}
                  placeholder="0.00"
                  pattern="[0-9]*[.,]?[0-9]*"
                  className="w-28"
                />
                <Input
                  value={row.code}
                  onChange={(e) => {
                    const updated = [...currencyRows]
                    updated[index] = { ...updated[index], code: e.target.value.toUpperCase().slice(0, 3) }
                    setCurrencyRows(updated)
                  }}
                  placeholder="USD"
                  maxLength={3}
                  className="w-20 uppercase"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrencyRows(rows => rows.filter((_, i) => i !== index))}
                  className="px-2"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrencyRows(rows => [...rows, { code: '', rate: '' }])}
            >
              <Plus size={16} className="mr-1" />
              Add Currency
            </Button>
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

      {/* Accommodations Section */}
      <StaySection />

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
                Delete {entityLabel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>"{currentTrip.name}"</strong> and all
                  associated data including expenses, settlements, and shopping items.
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
                  {isDeleting ? 'Deleting...' : `Delete ${entityLabel}`}
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
            <DialogTitle>Edit {entityLabel} Details</DialogTitle>
            <DialogDescription>
              Update the name, dates, or tracking mode
            </DialogDescription>
          </DialogHeader>

          {/* Warning about meals */}
          {meals.length > 0 && (
            <Alert>
              <Info size={16} className="mt-0.5" />
              <AlertDescription>
                <strong>Note:</strong> Changing dates may hide meals that fall outside the
                new date range. Those meals will remain in the database.
              </AlertDescription>
            </Alert>
          )}

          <EventForm
            initialValues={{
              name: currentTrip.name,
              start_date: currentTrip.start_date,
              end_date: currentTrip.end_date,
              event_type: currentTrip.event_type,
              tracking_mode: currentTrip.tracking_mode,
              default_currency: currentTrip.default_currency,
            }}
            onSubmit={handleEditTrip}
            onCancel={() => setShowEditDialog(false)}
            submitLabel="Save Changes"
            isLoading={isUpdating}
            disableTrackingMode={participants.length > 0}
            isEditMode
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
