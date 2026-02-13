import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { CreateTripInput, TrackingMode } from '@/types/trip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp } from '@/lib/animations'

interface TripFormProps {
  onSubmit: (input: CreateTripInput) => Promise<void>
  onCancel?: () => void
  initialValues?: Partial<CreateTripInput>
  submitLabel?: string
  isLoading?: boolean
  disableTrackingMode?: boolean
}

export function TripForm({
  onSubmit,
  onCancel,
  initialValues,
  submitLabel = 'Create Trip',
  isLoading: externalLoading,
  disableTrackingMode = false
}: TripFormProps) {
  const [name, setName] = useState(initialValues?.name || '')
  const [startDate, setStartDate] = useState(initialValues?.start_date || new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(initialValues?.end_date || new Date().toISOString().split('T')[0])
  const [trackingMode, setTrackingMode] = useState<TrackingMode>(initialValues?.tracking_mode || 'individuals')
  const [defaultCurrency, setDefaultCurrency] = useState(initialValues?.default_currency || 'EUR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSubmitting = externalLoading || loading

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter a trip name')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        tracking_mode: trackingMode,
        default_currency: defaultCurrency,
      })
    } catch (err) {
      setError('Failed to save trip. Please try again.')
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
        <Label htmlFor="name">Trip Name</Label>
        <Input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Summer Vacation 2025"
          required
          disabled={isSubmitting}
        />
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="defaultCurrency">Default Currency</Label>
        <Select
          value={defaultCurrency}
          onValueChange={setDefaultCurrency}
          disabled={isSubmitting}
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
          All balances and settlements will be shown in this currency
        </p>
      </div>

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
