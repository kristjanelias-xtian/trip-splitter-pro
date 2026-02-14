import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, MapPin, User } from 'lucide-react'
import { useActivityContext } from '@/contexts/ActivityContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import type { Activity } from '@/types/activity'
import { ActivityForm } from './ActivityForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ActivityCardProps {
  activity: Activity
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const { deleteActivity } = useActivityContext()
  const { participants } = useParticipantContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const responsiblePerson = activity.responsible_participant_id
    ? participants.find((p) => p.id === activity.responsible_participant_id)
    : null

  const handleDelete = async () => {
    const success = await deleteActivity(activity.id)
    if (success) {
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="p-3 hover:shadow-md transition-shadow cursor-pointer bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900"
          onClick={() => setShowEditForm(true)}
        >
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-semibold text-foreground">{activity.title}</h4>
            <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {activity.description && (
            <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
          )}

          {activity.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <MapPin size={14} />
              <span>{activity.location}</span>
            </div>
          )}

          {responsiblePerson && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User size={14} />
              <span>{responsiblePerson.name}</span>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Edit Form Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={activity}
            date={activity.activity_date}
            timeSlot={activity.time_slot}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Activity?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{activity.title}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
