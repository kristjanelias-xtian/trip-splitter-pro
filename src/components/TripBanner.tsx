import { getTripGradientPattern } from '@/services/tripGradientService'
import { motion } from 'framer-motion'

export interface TripBannerProps {
  tripName: string
  compact?: boolean // For mobile/header version
}

export function TripBanner({ tripName, compact = false }: TripBannerProps) {
  // Get deterministic gradient pattern for this trip
  const pattern = getTripGradientPattern(tripName)

  if (compact) {
    // Compact version for header
    return (
      <motion.div
        className="relative h-12 rounded-lg overflow-hidden shadow-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Gradient Background */}
        <div
          className="absolute inset-0"
          style={{ background: pattern.gradient }}
        />

        {/* Icon Pattern Overlay (fewer icons for compact) */}
        {pattern.icons.slice(0, 2).map((icon, i) => {
          const Icon = icon.Icon
          return (
            <Icon
              key={i}
              size={icon.size * 0.6} // Smaller icons for compact
              className="absolute text-white pointer-events-none"
              style={{
                left: `${icon.x}%`,
                top: `${icon.y}%`,
                transform: `translate(-50%, -50%) rotate(${icon.rotation}deg)`,
                opacity: icon.opacity * 0.8,
              }}
            />
          )
        })}

        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />

        {/* Content */}
        <div className="relative h-full px-4 flex items-center">
          <h1 className="text-white font-bold text-lg drop-shadow-md truncate">
            {tripName}
          </h1>
        </div>
      </motion.div>
    )
  }

  // Full version for page headers
  return (
    <motion.div
      className="relative w-full h-[160px] md:h-[200px] lg:h-[240px] rounded-lg overflow-hidden shadow-lg"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Gradient Background */}
      <div
        className="absolute inset-0"
        style={{ background: pattern.gradient }}
      />

      {/* Icon Pattern Overlay */}
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
      <div className="relative h-full p-6 md:p-8 flex flex-col justify-end">
        <div>
          {/* Theme Badge */}
          <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
            <span className="text-white text-xs md:text-sm font-medium capitalize">
              {pattern.theme} Trip
            </span>
          </div>

          {/* Trip Name */}
          <h1 className="text-white font-bold text-3xl md:text-4xl lg:text-5xl drop-shadow-lg">
            {tripName}
          </h1>
        </div>
      </div>
    </motion.div>
  )
}
