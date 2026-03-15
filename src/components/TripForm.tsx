// SPDX-License-Identifier: Apache-2.0
import { useState, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CreateTripInput } from '@/types/trip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { fadeInUp } from '@/lib/animations'

interface TripFormProps {
  onSubmit: (input: CreateTripInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateTripInput>
  submitLabel?: string
  isLoading?: boolean
  isEditMode?: boolean
}

export function TripForm({
  onSubmit,
  onCancel,
  initialValues,
  submitLabel,
  isLoading: externalLoading,
  isEditMode = false,
}: TripFormProps) {
  const { t } = useTranslation()
  const resolvedSubmitLabel = submitLabel ?? t('trip.createTrip')
  const [name, setName] = useState(initialValues?.name || '')
  const [startDate, setStartDate] = useState(initialValues?.start_date || new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(initialValues?.end_date || new Date().toISOString().split('T')[0])
  const [defaultCurrency, setDefaultCurrency] = useState(initialValues?.default_currency || 'EUR')
  const [enableMeals, setEnableMeals] = useState(initialValues?.enable_meals ?? false)
  const [enableActivities, setEnableActivities] = useState(initialValues?.enable_activities ?? false)
  const [enableShopping, setEnableShopping] = useState(initialValues?.enable_shopping ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSubmitting = externalLoading || loading

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(t('trip.tripNameRequired', { type: t('trip.tripLabel').toLowerCase() }))
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError(t('trip.endDateAfterStart'))
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        tracking_mode: 'individuals',
        default_currency: defaultCurrency.trim().toUpperCase() || 'EUR',
        enable_meals: enableMeals,
        enable_activities: enableActivities,
        enable_shopping: enableShopping,
      })
    } catch (err) {
      setError(t('trip.failedToSave'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6 bg-card p-6 rounded-lg soft-shadow"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t('trip.tripName', { type: t('trip.tripLabel') })}</Label>
        <Input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('trip.tripNamePlaceholder')}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">{t('trip.startDate')}</Label>
          <Input
            type="date"
            id="start_date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">{t('trip.endDate')}</Label>
          <Input
            type="date"
            id="end_date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultCurrency">{t('trip.defaultCurrency')}</Label>
        <Input
          id="defaultCurrency"
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="EUR"
          maxLength={3}
          className="w-32 uppercase"
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          {t('trip.defaultCurrencyHint')}
        </p>
      </div>

      {!isEditMode && (
        <div className="space-y-4">
          <Label>{t('common.features')}</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t('trip.mealPlanning')}</span>
              <p className="text-xs text-muted-foreground">{t('trip.mealPlanningDesc')}</p>
            </div>
            <Switch
              checked={enableMeals}
              onCheckedChange={setEnableMeals}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t('trip.activityPlanning')}</span>
              <p className="text-xs text-muted-foreground">{t('trip.activityPlanningDesc')}</p>
            </div>
            <Switch
              checked={enableActivities}
              onCheckedChange={setEnableActivities}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">{t('trip.shoppingList')}</span>
              <p className="text-xs text-muted-foreground">{t('trip.shoppingListDesc')}</p>
            </div>
            <Switch
              checked={enableShopping}
              onCheckedChange={setEnableShopping}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? t('common.saving') : resolvedSubmitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            variant="outline"
            size="lg"
          >
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </motion.form>
  )
}
