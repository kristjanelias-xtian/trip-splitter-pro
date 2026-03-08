// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, ExternalLink, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { useStayContext } from '@/contexts/StayContext'
import type { Stay } from '@/types/stay'
import { StayForm } from './StayForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

      {/* Edit Form */}
      <ResponsiveOverlay open={showEditForm} onClose={() => setShowEditForm(false)} title="Edit Accommodation" hasInputs>
        <StayForm
          stay={stay}
          onSuccess={() => setShowEditForm(false)}
          onCancel={() => setShowEditForm(false)}
        />
      </ResponsiveOverlay>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Accommodation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{stay.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
