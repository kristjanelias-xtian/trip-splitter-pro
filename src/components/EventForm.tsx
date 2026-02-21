import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Zap } from 'lucide-react'
import { CreateEventInput, TrackingMode } from '@/types/trip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { fadeInUp } from '@/lib/animations'

interface EventFormProps {
  onSubmit: (input: CreateEventInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateEventInput>
  submitLabel?: string
  isLoading?: boolean
  disableTrackingMode?: boolean
  isEditMode?: boolean
}

export function EventForm({
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = 'Create',
  isLoading: externalLoading,
  disableTrackingMode = false,
  isEditMode = false,
}: EventFormProps) {
  const today = new Date().toISOString().split('T')[0]
  const [eventType, setEventType] = useState<'trip' | 'event'>(initialValues?.event_type || 'trip')
  const [name, setName] = useState(initialValues?.name || '')
  const [startDate, setStartDate] = useState(initialValues?.start_date || today)
  const [endDate, setEndDate] = useState(initialValues?.end_date || today)
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(initialValues?.tracking_mode || 'individuals')
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
      setError(`Please enter a ${eventType === 'event' ? 'event' : 'trip'} name`)
      return
    }

    // For events, end_date = start_date. For trips, validate range.
    const resolvedEndDate = eventType === 'event' ? startDate : endDate
    if (eventType === 'trip' && new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        start_date: startDate,
        end_date: resolvedEndDate,
        event_type: eventType,
        tracking_mode: trackingMode,
        default_currency: defaultCurrency.trim().toUpperCase() || 'EUR',
        enable_meals: enableMeals,
        enable_activities: enableActivities,
        enable_shopping: enableShopping,
      })
    } catch (err) {
      setError(`Failed to save. Please try again.`)
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

      {/* Type selector — only shown when creating (not editing) */}
      {!isEditMode && (
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEventType('trip')}
              disabled={isSubmitting}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                eventType === 'trip'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <Calendar size={20} className={eventType === 'trip' ? 'text-primary' : 'text-muted-foreground'} />
              <div>
                <div className="font-medium text-foreground text-sm">Trip</div>
                <div className="text-xs text-muted-foreground">Multi-day</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setEventType('event')}
              disabled={isSubmitting}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                eventType === 'event'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <Zap size={20} className={eventType === 'event' ? 'text-primary' : 'text-muted-foreground'} />
              <div>
                <div className="font-medium text-foreground text-sm">Event</div>
                <div className="text-xs text-muted-foreground">One occasion</div>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{eventType === 'event' ? 'Event' : 'Trip'} Name</Label>
        <Input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={eventType === 'event' ? 'e.g., Team Dinner, Wedding Party' : 'e.g., Summer Vacation 2025'}
          required
          disabled={isSubmitting}
        />
      </div>

      {eventType === 'trip' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
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
            <Label htmlFor="end_date">End Date</Label>
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
      ) : (
        <div className="space-y-2">
          <Label htmlFor="event_date">Date</Label>
          <Input
            type="date"
            id="event_date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="defaultCurrency">Default Currency</Label>
        <Input
          id="defaultCurrency"
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="EUR"
          maxLength={3}
          className="w-32 uppercase"
          style={{ fontSize: '1rem' }}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          All balances and settlements will be shown in this currency
        </p>
      </div>

      {/* Feature toggles — shown for trips only when creating; hidden for events by default */}
      {!isEditMode && eventType === 'trip' && (
        <div className="space-y-4">
          <Label>Features</Label>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Meal Planning</span>
              <p className="text-xs text-muted-foreground">Plan meals and assign cooking responsibilities</p>
            </div>
            <Switch
              checked={enableMeals}
              onCheckedChange={setEnableMeals}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Activity Planning</span>
              <p className="text-xs text-muted-foreground">Plan activities for each day of your trip</p>
            </div>
            <Switch
              checked={enableActivities}
              onCheckedChange={setEnableActivities}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Shopping List</span>
              <p className="text-xs text-muted-foreground">Collaborative shopping list with real-time updates</p>
            </div>
            <Switch
              checked={enableShopping}
              onCheckedChange={setEnableShopping}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label>Tracking Mode</Label>
        {disableTrackingMode && (
          <p className="text-sm text-muted-foreground">
            Cannot change tracking mode after adding participants
          </p>
        )}
        <div className="space-y-3">
          <label className="flex items-start p-4 rounded-lg border-2 border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input
              type="radio"
              name="trackingMode"
              value="individuals"
              checked={trackingMode === 'individuals'}
              onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}
              className="mt-0.5 mr-3 text-primary focus:ring-primary"
              disabled={isSubmitting || disableTrackingMode}
            />
            <div>
              <div className="font-medium text-foreground">Individuals only</div>
              <div className="text-sm text-muted-foreground mt-1">
                Track expenses per person
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 rounded-lg border-2 border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5 has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input
              type="radio"
              name="trackingMode"
              value="families"
              checked={trackingMode === 'families'}
              onChange={(e) => setTrackingMode(e.target.value as TrackingMode)}
              className="mt-0.5 mr-3 text-primary focus:ring-primary"
              disabled={isSubmitting || disableTrackingMode}
            />
            <div>
              <div className="font-medium text-foreground">Individuals + Families</div>
              <div className="text-sm text-muted-foreground mt-1">
                Track at family level with individual breakdowns
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            variant="outline"
            size="lg"
          >
            Cancel
          </Button>
        )}
      </div>
    </motion.form>
  )
}
