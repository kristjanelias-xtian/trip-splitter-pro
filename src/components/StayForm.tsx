import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { useStayContext } from '@/contexts/StayContext'
import type { Stay, CreateStayInput, UpdateStayInput } from '@/types/stay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fadeInUp } from '@/lib/animations'

interface StayFormProps {
  stay?: Stay
  onSuccess: () => void
  onCancel: () => void
}

export function StayForm({ stay, onSuccess, onCancel }: StayFormProps) {
  const { currentTrip } = useCurrentTrip()
  const { createStay, updateStay } = useStayContext()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: stay?.name || '',
    link: stay?.link || '',
    comment: stay?.comment || '',
    latitude: stay?.latitude != null ? String(stay.latitude) : '',
    longitude: stay?.longitude != null ? String(stay.longitude) : '',
    check_in_date: stay?.check_in_date || currentTrip?.start_date || '',
    check_out_date: stay?.check_out_date || currentTrip?.end_date || '',
  })

  if (!currentTrip) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Please enter an accommodation name')
      return
    }

    if (!formData.check_in_date || !formData.check_out_date) {
      setError('Please enter both check-in and check-out dates')
      return
    }

    if (formData.check_out_date <= formData.check_in_date) {
      setError('Check-out date must be after check-in date')
      return
    }

    setSubmitting(true)

    try {
      const parsedLat = formData.latitude.trim() ? parseFloat(formData.latitude) : null
      const parsedLng = formData.longitude.trim() ? parseFloat(formData.longitude) : null

      if (stay) {
        const updateData: UpdateStayInput = {
          name: formData.name.trim(),
          link: formData.link.trim() || undefined,
          comment: formData.comment.trim() || undefined,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          latitude: parsedLat != null && !isNaN(parsedLat) ? parsedLat : null,
          longitude: parsedLng != null && !isNaN(parsedLng) ? parsedLng : null,
        }

        const result = await updateStay(stay.id, updateData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to update accommodation')
        }
      } else {
        const createData: CreateStayInput = {
          trip_id: currentTrip.id,
          name: formData.name.trim(),
          link: formData.link.trim() || undefined,
          comment: formData.comment.trim() || undefined,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          latitude: parsedLat != null && !isNaN(parsedLat) ? parsedLat : null,
          longitude: parsedLng != null && !isNaN(parsedLng) ? parsedLng : null,
        }

        const result = await createStay(createData)
        if (result) {
          onSuccess()
        } else {
          setError('Failed to add accommodation')
        }
      }
    } catch (error) {
      console.error('Error saving stay:', error)
      setError('An error occurred while saving')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="stay-name">Accommodation Name</Label>
        <Input
          type="text"
          id="stay-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Beach Resort, Airbnb Downtown"
          style={{ fontSize: '1rem' }}
          required
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stay-link">Booking Link (Optional)</Label>
        <Input
          type="url"
          id="stay-link"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="https://..."
          style={{ fontSize: '1rem' }}
          disabled={submitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stay-comment">Comment (Optional)</Label>
        <Textarea
          id="stay-comment"
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          placeholder="Check-in instructions, address, notes..."
          rows={2}
          style={{ fontSize: '1rem' }}
          disabled={submitting}
          required={false}
        />
      </div>

      <div className="space-y-2">
        <Label>Coordinates (Optional)</Label>
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            inputMode="decimal"
            id="stay-latitude"
            value={formData.latitude}
            onChange={(e) => setFormData({ ...formData, latitude: e.target.value.replace(',', '.') })}
            placeholder="Latitude"
            pattern="-?[0-9]*[.,]?[0-9]*"
            style={{ fontSize: '1rem' }}
            disabled={submitting}
          />
          <Input
            type="text"
            inputMode="decimal"
            id="stay-longitude"
            value={formData.longitude}
            onChange={(e) => setFormData({ ...formData, longitude: e.target.value.replace(',', '.') })}
            placeholder="Longitude"
            pattern="-?[0-9]*[.,]?[0-9]*"
            style={{ fontSize: '1rem' }}
            disabled={submitting}
          />
        </div>
        <p className="text-xs text-muted-foreground">Add coordinates to show on the planner map</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stay-checkin">Check-in Date</Label>
          <Input
            type="date"
            id="stay-checkin"
            value={formData.check_in_date}
            onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
            min={currentTrip.start_date}
            max={currentTrip.end_date}
            style={{ fontSize: '1rem' }}
            required
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stay-checkout">Check-out Date</Label>
          <Input
            type="date"
            id="stay-checkout"
            value={formData.check_out_date}
            onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
            min={currentTrip.start_date}
            max={currentTrip.end_date}
            style={{ fontSize: '1rem' }}
            required
            disabled={submitting}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={submitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? 'Saving...' : stay ? 'Update Accommodation' : 'Add Accommodation'}
        </Button>
      </div>
    </motion.form>
  )
}
