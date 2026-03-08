// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import type { ShoppingItemWithMeals } from '@/types/shopping'
import { CATEGORY_LABELS } from '@/types/shopping'
import { ShoppingItemForm } from './ShoppingItemForm'
import { Button } from '@/components/ui/button'
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

interface ShoppingItemRowProps {
  item: ShoppingItemWithMeals
}

export function ShoppingItemRow({ item }: ShoppingItemRowProps) {
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
  }

  return (
    <>
      <tr
        className={`border-b transition-colors hover:bg-muted/50 cursor-pointer ${
          item.is_completed ? 'bg-positive/5' : ''
        }`}
        onClick={() => setShowEditForm(true)}
      >
        {/* Checkbox */}
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={item.is_completed}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </td>

        {/* Item Name */}
        <td className="p-3">
          <div className="flex flex-col gap-1">
            <span
              className={`font-medium ${
                item.is_completed
                  ? 'line-through text-muted-foreground'
                  : 'text-foreground'
              }`}
            >
              {item.name}
              {item.quantity && (
                <span className="text-sm text-muted-foreground ml-1">
                  ({item.quantity})
                </span>
              )}
            </span>
            {item.meal_titles && item.meal_titles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.meal_titles.slice(0, 2).map((title, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {title}
                    {item.meal_dates[idx] && (
                      <span className="ml-1 opacity-70">
                        ({new Date(item.meal_dates[idx]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                      </span>
                    )}
                  </Badge>
                ))}
                {item.meal_titles.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{item.meal_titles.length - 2} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </td>

        {/* Category */}
        <td className="p-3">
          <Badge variant="outline" className="whitespace-nowrap">
            {CATEGORY_LABELS[item.category]}
          </Badge>
        </td>

        {/* Actions */}
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 size={14} />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </td>
      </tr>

      {/* Edit Form */}
      <ResponsiveOverlay open={showEditForm} onClose={() => setShowEditForm(false)} title="Edit Shopping Item" hasInputs>
        <ShoppingItemForm
          item={item}
          onSuccess={() => setShowEditForm(false)}
          onCancel={() => setShowEditForm(false)}
        />
      </ResponsiveOverlay>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shopping Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{item.name}"?
              {item.meal_ids.length > 0 && (
                <span className="block mt-2">
                  This item is linked to {item.meal_ids.length} meal(s).
                </span>
              )}
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
