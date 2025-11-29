import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface MealCompletionRingProps {
  percentage: number
  size?: number
  className?: string
}

export function MealCompletionRing({
  percentage,
  size = 48,
  className,
}: MealCompletionRingProps) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // Color based on completion percentage
  const getColor = () => {
    if (percentage === 0) return '#6B7280' // gray
    if (percentage < 50) return '#F4A261' // gold
    if (percentage < 100) return '#6A994E' // sage
    return '#90BE6D' // positive green
  }

  return (
    <div className={cn('relative flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut',
          }}
        />
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold drop-shadow-md" style={{ fontSize: size / 4 }}>
          {percentage}%
        </span>
      </div>
    </div>
  )
}
