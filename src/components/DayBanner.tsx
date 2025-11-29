import { useState, useEffect } from 'react'
import { DateContext, formatDayHeader } from '@/lib/dateUtils'
import { getMealPhoto, MealPhoto } from '@/services/mealImageService'
import { MealWithIngredients } from '@/types/meal'
import { Badge } from '@/components/ui/badge'
import { MealCompletionRing } from '@/components/MealCompletionRing'

export interface DayBannerProps {
  date: string
  dayNumber: number
  context: DateContext
  completionPercentage: number
  meals: MealWithIngredients[]
}

export function DayBanner({
  date,
  dayNumber,
  context,
  completionPercentage,
  meals,
}: DayBannerProps) {
  const [photo, setPhoto] = useState<MealPhoto | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadPhoto() {
      setIsLoading(true)
      try {
        const mealPhoto = await getMealPhoto(date, meals)
        if (mounted) {
          setPhoto(mealPhoto)
        }
      } catch (error) {
        console.error('Error loading meal photo:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadPhoto()

    return () => {
      mounted = false
    }
  }, [date, meals])

  // Context badge styling
  const contextStyles = {
    today: 'bg-positive/10 border-positive/30 text-positive-dark',
    tomorrow: 'bg-accent/10 border-accent/30 text-accent',
    past: 'bg-muted border-border text-muted-foreground',
    future: 'bg-card border-border text-foreground',
  }

  // Background style (photo or gradient)
  const backgroundStyle = photo?.fallback
    ? { background: photo.url }
    : photo
    ? { backgroundImage: `url(${photo.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }

  return (
    <div className="relative w-full h-[120px] md:h-[160px] lg:h-[200px] rounded-lg overflow-hidden">
      {/* Background Image/Gradient */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          ...backgroundStyle,
          opacity: isLoading ? 0 : 1,
        }}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse" />
      )}

      {/* Gradient Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative h-full p-4 md:p-6 flex flex-col justify-between">
        {/* Top Row: Day Badge + Context Badge */}
        <div className="flex items-start justify-between">
          {/* Day Number Ribbon */}
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md shadow-md font-bold text-sm md:text-base">
            Day {dayNumber}
          </div>

          {/* Context Badge */}
          <Badge
            variant="outline"
            className={`${contextStyles[context]} backdrop-blur-sm capitalize`}
          >
            {context}
          </Badge>
        </div>

        {/* Bottom Row: Date + Completion Ring */}
        <div className="flex items-end justify-between">
          {/* Date Display */}
          <div>
            <h3 className="text-white font-bold text-lg md:text-xl lg:text-2xl drop-shadow-md">
              {formatDayHeader(date)}
            </h3>
            {photo && !photo.fallback && photo.photographer && (
              <p className="text-white/70 text-xs mt-1">
                Photo by{' '}
                <a
                  href={photo.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  {photo.photographer}
                </a>
              </p>
            )}
          </div>

          {/* Completion Ring */}
          <MealCompletionRing
            percentage={completionPercentage}
            size={48}
            className="md:w-16 md:h-16"
          />
        </div>
      </div>
    </div>
  )
}
