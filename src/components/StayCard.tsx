import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, ExternalLink, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { useStayContext } from '@/contexts/StayContext'
import type { Stay } from '@/types/stay'
import { StayForm } from './StayForm'
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

interface StayCardProps {
  stay: Stay
}

export function StayCard({ stay }: StayCardProps) {
  const { deleteStay } = useStayContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    const success = await deleteStay(stay.id)
    if (success) {
      setShowDeleteConfirm(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="p-3 hover:shadow-md transition-shadow cursor-pointer bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
          onClick={() => setShowEditForm(true)}
        >
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-semibold text-foreground">{stay.name}</h4>
            <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
              {stay.link && (
                <Button
                  onClick={() => window.open(stay.link!, '_blank', 'noopener,noreferrer')}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                >
                  <ExternalLink size={14} />
                </Button>
              )}
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

          <p className="text-sm text-muted-foreground mb-1">
            {formatDate(stay.check_in_date)} &ndash; {formatDate(stay.check_out_date)}
          </p>

          {stay.comment && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate">{stay.comment}</span>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Edit Form Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Accommodation</DialogTitle>
          </DialogHeader>
          <StayForm
            stay={stay}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Accommodation?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{stay.name}"?
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
