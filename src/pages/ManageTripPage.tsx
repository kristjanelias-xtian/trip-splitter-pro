// SPDX-License-Identifier: Apache-2.0
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Edit, Trash2, Info, X, Plus, ArrowLeft } from 'lucide-react'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { format } from 'date-fns'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useMealContext } from '@/contexts/MealContext'
import { ParticipantsSetup } from '@/components/setup/ParticipantsSetup'
import { EventForm } from '@/components/EventForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
import { DialogDescription } from '@/components/ui/dialog'
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
import { InstallGuide } from '@/components/InstallGuide'
import { removeFromMyTrips } from '@/lib/myTripsStorage'
import { useAuth } from '@/contexts/AuthContext'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { isAdminUser } from '@/lib/adminAuth'
import { ThemeToggle } from '@/components/ThemeToggle'

export function ManageTripPage() {
  const { t, i18n } = useTranslation()
  const { currentTrip, tripCode } = useCurrentTrip()
  const { updateTrip, deleteTrip } = useTripContext()
  const { user } = useAuth()
  const location = useLocation()
  const fromQuick = !!(location.state as any)?.fromQuick
  const { shouldShowInSettings } = usePWAInstall()
  const { participants, loading: participantsLoading, error: participantError, refreshParticipants } = useParticipantContext()
  const { meals } = useMealContext()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [retrying, setRetrying] = useState(false)

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
        <h2 className="text-2xl font-bold text-foreground">{t('layout.manage')}</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {t('manage.noTripSelected')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const entityLabel = currentTrip.event_type === 'event' ? t('trip.eventLabel') : t('trip.tripLabel')
  const isEvent = currentTrip.event_type === 'event'
  const canDelete = !!user && (
    (!!currentTrip.created_by && user.id === currentTrip.created_by) ||
    isAdminUser(user.id)
  )

  const handleEditTrip = async (values: CreateEventInput) => {
    setIsUpdating(true)
    try {
      const success = await updateTrip(currentTrip.id, {
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        event_type: values.event_type,
        default_currency: values.default_currency,
      })

      if (success) {
        setShowEditDialog(false)
        toast({
          title: t('manage.tripUpdated', { label: entityLabel }),
          description: t('manage.tripUpdatedDesc'),
        })
      } else {
        toast({
          variant: 'destructive',
          title: t('manage.updateFailed'),
          description: t('manage.updateFailedDesc', { label: entityLabel.toLowerCase() }),
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('manage.errorOccurred'),
        description: t('manage.errorOccurredDesc', { label: entityLabel.toLowerCase() }),
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const featureLabels: Record<string, string> = {
    enable_meals: t('manage.mealPlanning'),
    enable_activities: t('manage.activityPlanning'),
    enable_shopping: t('manage.shoppingList'),
    default_split_all: t('manage.splitBetweenEveryone'),
    enable_settlement_reminders: t('manage.settlementReminders'),
  }

  const handleToggleFeature = async (feature: 'enable_meals' | 'enable_activities' | 'enable_shopping' | 'default_split_all' | 'enable_settlement_reminders', value: boolean) => {
    setTogglingFeatures(prev => new Set(prev).add(feature))
    try {
      const success = await updateTrip(currentTrip.id, { [feature]: value })
      if (success) {
        toast({
          title: t('manage.featureUpdated'),
          description: value ? t('manage.featureEnabled', { feature: featureLabels[feature] }) : t('manage.featureDisabled', { feature: featureLabels[feature] }),
        })
      } else {
        toast({
          variant: 'destructive',
          title: t('manage.updateFailed'),
          description: t('manage.featureUpdateFailed'),
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('manage.errorOccurred'),
        description: t('manage.featureUpdateError'),
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
          title: t('manage.currencySettingsSaved'),
          description: t('manage.currencySettingsSavedDesc'),
        })
      } else {
        toast({
          variant: 'destructive',
          title: t('manage.currencySaveFailed'),
          description: t('manage.currencySaveFailedDesc'),
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('manage.errorOccurred'),
        description: t('manage.currencySaveError'),
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
        // Remove from My Trips localStorage (FINDING-11: was using wrong key 'myTrips')
        removeFromMyTrips(currentTrip.trip_code)

        toast({
          title: t('manage.tripDeleted', { label: entityLabel }),
          description: t('manage.tripDeletedDesc', { label: entityLabel.toLowerCase() }),
        })

        // Navigate to home page
        navigate('/')
      } else {
        toast({
          variant: 'destructive',
          title: t('manage.deleteFailed'),
          description: t('manage.deleteFailedDesc', { label: entityLabel.toLowerCase() }),
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('manage.errorOccurred'),
        description: t('manage.deleteError', { label: entityLabel.toLowerCase() }),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back to Quick View */}
      {fromQuick && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/t/${tripCode}/quick`)}
          className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <ArrowLeft size={14} />
          {t('manage.backToQuickView')}
        </Button>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('manage.title', { label: entityLabel })}</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentTrip.name}</p>
      </div>

      {/* Participants Section — top position for easy onboarding */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t('manage.participants')}
        </h3>
        {participantsLoading ? (
          <PageLoadingState />
        ) : participantError ? (
          <PageErrorState error={participantError} onRetry={async () => {
            setRetrying(true)
            try { await refreshParticipants() } finally { setRetrying(false) }
          }} retrying={retrying} />
        ) : <>
          {participants.length === 0 && (
            <Card className="border-dashed border-primary/40 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-primary font-medium">
                  {t('manage.addParticipantsToGetStarted')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('manage.participantsRequiredForExpenses')}
                </p>
              </CardContent>
            </Card>
          )}
          <ParticipantsSetup />
        </>}
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('manage.tripDetails', { label: entityLabel })}</CardTitle>
          <CardDescription>{t('manage.tripDetailsDescription', { label: entityLabel.toLowerCase() })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t('common.name')}</Label>
              <p className="text-sm font-medium">{currentTrip.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('manage.code')}</Label>
              <p className="text-sm font-mono font-medium">{tripCode}</p>
            </div>
            {isEvent ? (
              <div>
                <Label className="text-muted-foreground">{t('common.date')}</Label>
                <p className="text-sm font-medium">
                  {format(new Date(currentTrip.start_date), 'PPP')}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-muted-foreground">{t('manage.startDate')}</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(currentTrip.start_date), 'PPP')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('manage.endDate')}</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(currentTrip.end_date), 'PPP')}
                  </p>
                </div>
              </>
            )}
          </div>
          <Button onClick={() => setShowEditDialog(true)} className="mt-4">
            <Edit size={16} className="mr-2" />
            {t('manage.editDetails')}
          </Button>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.features')}</CardTitle>
          <CardDescription>{t('manage.featuresDescription', { label: entityLabel.toLowerCase() })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('manage.mealPlanning')}</Label>
              <p className="text-xs text-muted-foreground">{t('manage.mealPlanningDesc')}</p>
            </div>
            <Switch
              checked={currentTrip.enable_meals}
              onCheckedChange={(checked) => handleToggleFeature('enable_meals', checked)}
              disabled={togglingFeatures.has('enable_meals')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('manage.activityPlanning')}</Label>
              <p className="text-xs text-muted-foreground">{t('manage.activityPlanningDesc')}</p>
            </div>
            <Switch
              checked={currentTrip.enable_activities}
              onCheckedChange={(checked) => handleToggleFeature('enable_activities', checked)}
              disabled={togglingFeatures.has('enable_activities')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('manage.shoppingList')}</Label>
              <p className="text-xs text-muted-foreground">{t('manage.shoppingListDesc')}</p>
            </div>
            <Switch
              checked={currentTrip.enable_shopping}
              onCheckedChange={(checked) => handleToggleFeature('enable_shopping', checked)}
              disabled={togglingFeatures.has('enable_shopping')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('manage.splitBetweenEveryone')}</Label>
              <p className="text-xs text-muted-foreground">{t('manage.splitBetweenEveryoneDesc')}</p>
            </div>
            <Switch
              checked={currentTrip.default_split_all ?? true}
              onCheckedChange={(checked) => handleToggleFeature('default_split_all', checked)}
              disabled={togglingFeatures.has('default_split_all')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('manage.settlementReminders')}</Label>
              <p className="text-xs text-muted-foreground">{t('manage.settlementRemindersDesc')}</p>
            </div>
            <Switch
              checked={currentTrip.enable_settlement_reminders ?? true}
              onCheckedChange={(checked) => handleToggleFeature('enable_settlement_reminders', checked)}
              disabled={togglingFeatures.has('enable_settlement_reminders')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('manage.currencySettings')}</CardTitle>
          <CardDescription>{t('manage.currencySettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">{t('manage.defaultCurrency')}</Label>
            <Input
              id="defaultCurrency"
              value={currencyDefault}
              onChange={(e) => setCurrencyDefault(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="EUR"
              maxLength={3}
              className="w-32 uppercase"
            />
            <p className="text-xs text-muted-foreground">
              {t('manage.defaultCurrencyHint')}
            </p>
          </div>

          <div className="space-y-3">
            <Label>{t('manage.exchangeRates')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('manage.exchangeRatesHint', { currency: currencyDefault || '...' })}
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
              {t('manage.addCurrency')}
            </Button>
          </div>

          <Button
            onClick={handleSaveCurrencySettings}
            disabled={isSavingCurrency}
          >
            {isSavingCurrency ? t('common.saving') : t('manage.saveCurrencySettings')}
          </Button>
        </CardContent>
      </Card>

      {/* Accommodations Section */}
      <StaySection />

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('manage.appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ThemeToggle />
          <div>
            <Label className="text-sm font-medium mb-2 block">{t('settings.language')}</Label>
            <div className="flex gap-2">
              <Button
                variant={i18n.language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => i18n.changeLanguage('en')}
              >
                English
              </Button>
              <Button
                variant={i18n.language === 'et' ? 'default' : 'outline'}
                size="sm"
                onClick={() => i18n.changeLanguage('et')}
              >
                Eesti
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PWA install guide — mobile only, hidden when already installed */}
      {shouldShowInSettings && (
        <InstallGuide variant="settings" />
      )}

      {/* Danger Zone — only visible to trip creator or admin */}
      {canDelete && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t('manage.dangerZone')}</CardTitle>
            <CardDescription>{t('manage.irreversibleActions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 size={16} className="mr-2" />
                  {t('manage.deleteTrip', { label: entityLabel })}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('manage.deleteConfirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('manage.deleteConfirmDescription', { name: currentTrip.name })}
                    <br />
                    <br />
                    <strong>{t('manage.cannotBeUndone')}</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTrip}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? t('common.deleting') : t('manage.deleteTrip', { label: entityLabel })}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <ResponsiveOverlay
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        title={t('manage.editDialogTitle', { label: entityLabel })}
        hasInputs
        headerExtra={
          <DialogDescription className="px-4 pb-3 mt-0 text-center">
            {t('manage.editDialogDescription')}
          </DialogDescription>
        }
      >
        <div className="space-y-4">
          {/* Warning about meals */}
          {meals.length > 0 && (
            <Alert>
              <Info size={16} className="mt-0.5" />
              <AlertDescription>
                <strong>Note:</strong> {t('manage.dateChangeWarning')}
              </AlertDescription>
            </Alert>
          )}

          <EventForm
            initialValues={{
              name: currentTrip.name,
              start_date: currentTrip.start_date,
              end_date: currentTrip.end_date,
              event_type: currentTrip.event_type,
              default_currency: currentTrip.default_currency,
            }}
            onSubmit={handleEditTrip}
            onCancel={() => setShowEditDialog(false)}
            submitLabel={t('manage.saveChanges')}
            isLoading={isUpdating}
            isEditMode
          />
        </div>
      </ResponsiveOverlay>
    </div>
  )
}
