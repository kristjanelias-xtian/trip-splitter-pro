import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, Edit, Trash2, Plus, ShoppingBasket } from 'lucide-react'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import type { MealWithIngredients } from '@/types/meal'
import { MealForm } from './MealForm'
import { ShoppingItemForm } from './ShoppingItemForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MealCardProps {
  meal: MealWithIngredients
}

export function MealCard({ meal }: MealCardProps) {
  const { deleteMeal, refreshMeals } = useMealContext()
  const { participants } = useParticipantContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddIngredient, setShowAddIngredient] = useState(false)

  const responsiblePerson = meal.responsible_participant_id
    ? participants.find((p) => p.id === meal.responsible_participant_id)
    : null

  const handleDelete = async () => {
    const success = await deleteMeal(meal.id)
    if (success) {
      setShowDeleteConfirm(false)
    }
    // Note: Error handling should be done via toast in the parent component
  }

  const ingredientProgress =
    meal.ingredients_total > 0
      ? `${meal.ingredients_ready}/${meal.ingredients_total} ready`
      : 'No ingredients yet'

  const ingredientPercentage =
    meal.ingredients_total > 0
      ? Math.round((meal.ingredients_ready / meal.ingredients_total) * 100)
      : 0

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-3 hover:shadow-md transition-shadow">
          {/* Meal Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{meal.title}</h4>
              {meal.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {meal.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-2">
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

          {/* Responsible Person */}
          {responsiblePerson && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ChefHat size={14} />
              <span>{responsiblePerson.name}</span>
            </div>
          )}

          {/* Ingredient Progress */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShoppingBasket size={14} />
                <span>Ingredients</span>
              </div>
              <Button
                onClick={() => setShowAddIngredient(true)}
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
              >
                <Plus size={12} className="mr-1" />
                Add
              </Button>
            </div>

            {meal.ingredients_total > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{ingredientProgress}</span>
                  <Badge variant={ingredientPercentage === 100 ? "default" : "outline"} className="h-5">
                    {ingredientPercentage}%
                  </Badge>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${ingredientPercentage === 100 ? 'bg-positive' : 'bg-accent'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${ingredientPercentage}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No ingredients added yet</p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Edit Form Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Meal</DialogTitle>
          </DialogHeader>
          <MealForm
            meal={meal}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Meal?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{meal.title}"? The linked shopping items will remain in your shopping list.
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

      {/* Add Ingredient Dialog */}
      <Dialog open={showAddIngredient} onOpenChange={setShowAddIngredient}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Ingredient to "{meal.title}"</DialogTitle>
            <DialogDescription>
              Create a shopping item that will be linked to this meal.
            </DialogDescription>
          </DialogHeader>
          <ShoppingItemForm
            initialMealIds={[meal.id]}
            onSuccess={async () => {
              await refreshMeals()
              setShowAddIngredient(false)
            }}
            onCancel={() => setShowAddIngredient(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
