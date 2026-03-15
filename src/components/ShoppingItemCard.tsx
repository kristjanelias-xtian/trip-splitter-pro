// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Edit, Trash2 } from 'lucide-react'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import type { ShoppingItemWithMeals } from '@/types/shopping'
import { CATEGORY_LABELS } from '@/types/shopping'
import { ShoppingItemForm } from './ShoppingItemForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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

interface ShoppingItemCardProps {
  item: ShoppingItemWithMeals
}

export function ShoppingItemCard({ item }: ShoppingItemCardProps) {
  const { t } = useTranslation()
  const { toggleItemCompleted, deleteShoppingItem } = useShoppingContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    await toggleItemCompleted(item.id)
    setToggling(false)
  }

  const handleDelete = async () => {
    const success = await deleteShoppingItem(item.id)
    if (success) {
      setShowDeleteConfirm(false)
    }
    // Note: Error handling should be done via toast in the parent component
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={`p-4 transition-all ${
            item.is_completed
              ? 'border-positive/30 bg-positive/5'
              : ''
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <Checkbox
              checked={item.is_completed}
              onCheckedChange={handleToggle}
              disabled={toggling}
              className="mt-0.5"
            />

            {/* Item Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4
                    className={`font-medium ${
                      item.is_completed
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {item.name}
                    {item.quantity && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({item.quantity})
                      </span>
                    )}
                  </h4>

                  {/* Category Badge */}
                  <div className="flex items-center gap-1 flex-wrap mt-1">
                    <Badge variant="outline" className="h-5">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>

                    {/* Meal Tags */}
                    {item.meal_titles.length > 0 && (
                      <>
                        {item.meal_titles.slice(0, 2).map((title, idx) => (
                          <Badge key={idx} variant="soft" className="h-5">
                            {title}
                          </Badge>
                        ))}
                        {item.meal_titles.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{item.meal_titles.length - 2} more
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    onClick={() => setShowEditForm(true)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Edit size={14} />
                  </Button>
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
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Edit Form */}
      <ResponsiveOverlay open={showEditForm} onClose={() => setShowEditForm(false)} title={t('shopping.editItem')} hasInputs>
        <ShoppingItemForm
          item={item}
          onSuccess={() => setShowEditForm(false)}
          onCancel={() => setShowEditForm(false)}
        />
      </ResponsiveOverlay>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shopping.deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shopping.deleteItemConfirmShort', { name: item.name })}
              {item.meal_ids.length > 0 && (
                <span className="block mt-2">
                  {t('shopping.linkedToMeals', { count: item.meal_ids.length })}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
