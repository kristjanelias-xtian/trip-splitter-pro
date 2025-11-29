import { useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { useShoppingContext } from '@/contexts/ShoppingContext'
import type { ShoppingItemWithMeals } from '@/types/shopping'
import { CATEGORY_LABELS } from '@/types/shopping'
import { ShoppingItemForm } from './ShoppingItemForm'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
        className={`border-b transition-colors hover:bg-muted/50 ${
          item.is_completed ? 'bg-positive/5' : ''
        }`}
      >
        {/* Checkbox */}
        <td className="p-3">
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
        <td className="p-3">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditForm(true)}
              className="h-8 w-8 p-0"
            >
              <Edit size={14} />
              <span className="sr-only">Edit</span>
            </Button>
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

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shopping Item</DialogTitle>
          </DialogHeader>
          <ShoppingItemForm
            item={item}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shopping Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{item.name}"?
              {item.meal_ids.length > 0 && (
                <span className="block mt-2">
                  This item is linked to {item.meal_ids.length} meal(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
