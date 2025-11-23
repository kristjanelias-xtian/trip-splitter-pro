import { motion } from 'framer-motion'
import { Calendar, Edit, Trash2, Users, User } from 'lucide-react'
import { Trip } from '@/types/trip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface TripCardProps {
  trip: Trip
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TripCard({ trip, isSelected, onSelect, onEdit, onDelete }: TripCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateRange = () => {
    const start = formatDate(trip.start_date)
    const end = formatDate(trip.end_date)

    if (trip.start_date === trip.end_date) {
      return start
    }

    return `${start} - ${end}`
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`p-4 cursor-pointer transition-all ${
          isSelected
            ? 'border-2 border-primary bg-primary/5 shadow-md'
            : 'border hover:border-primary/50 hover:shadow-sm'
        }`}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {trip.name}
            </h3>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{formatDateRange()}</span>
            </div>

            <Badge variant={trip.tracking_mode === 'individuals' ? 'outline' : 'soft'}>
              {trip.tracking_mode === 'individuals' ? (
                <>
                  <User size={12} className="mr-1" />
                  Individuals only
                </>
              ) : (
                <>
                  <Users size={12} className="mr-1" />
                  Individuals + Families
                </>
              )}
            </Badge>
          </div>

          <div className="flex gap-1 ml-4">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Edit trip"
            >
              <Edit size={16} />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete trip"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
