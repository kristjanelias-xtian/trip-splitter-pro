import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, Edit, Trash2, ShoppingBasket, Utensils, Home, Receipt, MoreVertical } from 'lucide-react'
import { useMealContext } from '@/contexts/MealContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useExpenseContext } from '@/contexts/ExpenseContext'
import type { MealWithIngredients } from '@/types/meal'
import { MealForm } from './MealForm'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface MealCardProps {
  meal: MealWithIngredients
}

export function MealCard({ meal }: MealCardProps) {
  const { deleteMeal, updateMeal } = useMealContext()
  const { participants } = useParticipantContext()
  const { expenses } = useExpenseContext()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMarkRestaurant, setShowMarkRestaurant] = useState(false)
  const [showMarkAtHome, setShowMarkAtHome] = useState(false)

  const responsiblePerson = meal.responsible_participant_id
    ? participants.find((p) => p.id === meal.responsible_participant_id)
    : null

  // Find linked expense for restaurant meals
  const linkedExpense = meal.is_restaurant
    ? expenses.find(e => e.meal_id === meal.id)
    : null

  // Determine background color based on meal type
  const cardBackgroundClass = meal.is_restaurant
    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
    : meal.everyone_at_home
    ? 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900'
    : ''

  // Show ingredients section only for regular meals
  const showIngredients = !meal.is_restaurant && !meal.everyone_at_home

  const handleDelete = async () => {
    const success = await deleteMeal(meal.id)
    if (success) {
      setShowDeleteConfirm(false)
    }
    // Note: Error handling should be done via toast in the parent component
  }

  const handleMarkRestaurant = async () => {
    const success = await updateMeal(meal.id, {
      meal_date: meal.meal_date,
      meal_type: meal.meal_type,
      title: meal.title,
      description: meal.description || undefined,
      is_restaurant: true,
      everyone_at_home: false,
      responsible_participant_id: undefined, // Remove responsible person for restaurant meals
    })

    if (success) {
      // TODO: Link to expense if selected
      setShowMarkRestaurant(false)
    }
  }

  const handleMarkAtHome = async () => {
    const success = await updateMeal(meal.id, {
      meal_date: meal.meal_date,
      meal_type: meal.meal_type,
      title: meal.title,
      description: meal.description || undefined,
      is_restaurant: false,
      everyone_at_home: true,
      responsible_participant_id: undefined, // Remove responsible person for at-home meals
    })

    if (success) {
      setShowMarkAtHome(false)
    }
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
        <Card className={`p-3 hover:shadow-md transition-shadow ${cardBackgroundClass}`}>
          {/* Meal Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {meal.is_restaurant && (
                  <Badge variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Utensils size={12} className="mr-1" />
                    Restaurant
                  </Badge>
                )}
                {meal.everyone_at_home && (
                  <Badge variant="default" className="bg-sky-600 hover:bg-sky-700 text-white">
                    <Home size={12} className="mr-1" />
                    At Home
                  </Badge>
                )}
              </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!meal.is_restaurant && !meal.everyone_at_home && (
                    <>
                      <DropdownMenuItem onClick={() => setShowMarkRestaurant(true)}>
                        <Utensils size={14} className="mr-2" />
                        Mark as Restaurant
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowMarkAtHome(true)}>
                        <Home size={14} className="mr-2" />
                        Mark as At-Home
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete Meal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Responsible Person */}
          {responsiblePerson && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ChefHat size={14} />
              <span>{responsiblePerson.name}</span>
            </div>
          )}

          {/* Linked Expense Info (for restaurant meals) */}
          {meal.is_restaurant && linkedExpense && (
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900">
              <div className="flex items-center gap-2 text-sm">
                <Receipt size={14} className="text-amber-600" />
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">Linked Expense</p>
                  <p className="font-medium text-foreground">
                    {linkedExpense.description} - {linkedExpense.currency} {linkedExpense.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ingredient Progress */}
          {showIngredients && (
            <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <ShoppingBasket size={14} />
              <span>Ingredients</span>
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
          )}
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

      {/* Mark as Restaurant Dialog */}
      <Dialog open={showMarkRestaurant} onOpenChange={setShowMarkRestaurant}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Restaurant Meal?</DialogTitle>
            <DialogDescription>
              This will mark "{meal.title}" as a restaurant meal and remove the assigned cook.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowMarkRestaurant(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleMarkRestaurant()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Utensils size={14} className="mr-2" />
              Mark as Restaurant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as At-Home Dialog */}
      <Dialog open={showMarkAtHome} onOpenChange={setShowMarkAtHome}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as At-Home Meal?</DialogTitle>
            <DialogDescription>
              This will mark "{meal.title}" as an at-home meal where everyone eats separately. The assigned cook will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowMarkAtHome(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAtHome}
              className="bg-sky-600 hover:bg-sky-700"
            >
              <Home size={14} className="mr-2" />
              Mark as At-Home
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
