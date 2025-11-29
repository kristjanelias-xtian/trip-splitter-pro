import { DateContext, formatDayHeader } from '@/lib/dateUtils'
import { getGradientPattern } from '@/services/gradientService'
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
}: DayBannerProps) {
  // Get deterministic gradient pattern for this date
  const pattern = getGradientPattern(date)

  // Context badge styling
  const contextStyles = {
    today: 'bg-positive/10 border-positive/30 text-positive-dark',
    tomorrow: 'bg-accent/10 border-accent/30 text-accent',
    past: 'bg-muted border-border text-muted-foreground',
    future: 'bg-card border-border text-foreground',
  }

  return (
    <div className="relative w-full h-[120px] md:h-[160px] lg:h-[200px] rounded-lg overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-0"
        style={{ background: pattern.gradient }}
      />

      {/* Food Icon Pattern Overlay */}
      {pattern.icons.map((icon, i) => {
        const Icon = icon.Icon
        return (
          <Icon
            key={i}
            size={icon.size}
            className="absolute text-white pointer-events-none"
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              transform: `translate(-50%, -50%) rotate(${icon.rotation}deg)`,
              opacity: icon.opacity,
            }}
          />
        )
      })}

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
