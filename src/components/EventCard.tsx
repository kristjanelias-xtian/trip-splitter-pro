import { motion } from 'framer-motion'
import { Calendar, Edit, Trash2, Users, User, Zap } from 'lucide-react'
import { Event } from '@/types/trip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface EventCardProps {
  event: Event
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export function EventCard({ event, isSelected, onSelect, onEdit, onDelete }: EventCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateDisplay = () => {
    if (event.event_type === 'event' || event.start_date === event.end_date) {
      return formatDate(event.start_date)
    }
    return `${formatDate(event.start_date)} - ${formatDate(event.end_date)}`
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {event.name}
              </h3>
              {event.event_type === 'event' ? (
                <Badge variant="soft" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                  <Zap size={10} className="mr-1" />
                  Event
                </Badge>
              ) : (
                <Badge variant="outline" className="text-blue-600 border-blue-200 dark:text-blue-400">
                  <Calendar size={10} className="mr-1" />
                  Trip
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{formatDateDisplay()}</span>
            </div>

            <Badge variant={event.tracking_mode === 'individuals' ? 'outline' : 'soft'}>
              {event.tracking_mode === 'individuals' ? (
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
              title="Edit"
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
              title="Delete"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
