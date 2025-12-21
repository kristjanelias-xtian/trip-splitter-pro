/**
 * Trip Gradient Service with Location-Themed Patterns
 * Generates themed gradient backgrounds with location-specific icon overlays
 */

import type { LucideIcon } from 'lucide-react'
import {
  Palmtree,
  Waves,
  Sun,
  Fish,
  Shell,
  Mountain,
  Trees,
  CloudSnow,
  Snowflake,
  TreePine,
  Building2,
  Landmark,
  Coffee,
  ShoppingBag,
  Camera,
  Plane,
  MapPin,
  Compass,
  Luggage,
  Map,
} from 'lucide-react'

export interface TripGradientPattern {
  gradient: string
  icons: Array<{
    Icon: LucideIcon
    x: number // percentage 0-100
    y: number // percentage 0-100
    size: number // pixels
    rotation: number // degrees
    opacity: number
  }>
  theme: string
}

// Theme definitions with keywords, gradients, and icons
const THEMES = {
  beach: {
    keywords: ['beach', 'thailand', 'bali', 'hawaii', 'maldives', 'caribbean', 'coast', 'island', 'tropical', 'sea', 'ocean'],
    gradients: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-blue
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Bright blue
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Turquoise
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Soft blue-pink
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Sandy
    ],
    icons: [Palmtree, Waves, Sun, Fish, Shell],
  },
  mountain: {
    keywords: ['mountain', 'alps', 'hiking', 'trek', 'hill', 'peak', 'valley'],
    gradients: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple mountains
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Deep blue-green
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Soft pastels
    ],
    icons: [Mountain, Trees, TreePine],
  },
  ski: {
    keywords: ['ski', 'snow', 'winter', 'himos', 'levi', 'alps', 'whistler', 'aspen', 'slope'],
    gradients: [
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Icy pastels
      'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Purple-blue ice
      'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', // White-blue
      'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', // Ice blue
    ],
    icons: [CloudSnow, Snowflake, Mountain, TreePine],
  },
  city: {
    keywords: ['city', 'urban', 'paris', 'london', 'tokyo', 'york', 'berlin', 'rome', 'barcelona', 'amsterdam'],
    gradients: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Urban purple
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Vibrant pink
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Sunset city
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Soft pink
    ],
    icons: [Building2, Landmark, Coffee, ShoppingBag, Camera],
  },
  generic: {
    keywords: [],
    gradients: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    ],
    icons: [Plane, MapPin, Compass, Luggage, Map, Camera],
  },
}

type ThemeKey = keyof typeof THEMES

/**
 * Detects theme from trip name
 */
function detectTheme(tripName: string): ThemeKey {
  const lowerName = tripName.toLowerCase()

  // Check each theme's keywords
  for (const [themeName, theme] of Object.entries(THEMES)) {
    if (themeName === 'generic') continue

    for (const keyword of theme.keywords) {
      if (lowerName.includes(keyword)) {
        return themeName as ThemeKey
      }
    }
  }

  return 'generic'
}

/**
 * Seeded random number generator for deterministic patterns
 * Same seed + index always produces same result
 */
function seededRandom(seed: string, index: number): number {
  const hash = (seed + index).split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return Math.abs(Math.sin(hash))
}

/**
 * Gets gradient pattern for a specific trip
 * Same trip name always returns same themed gradient + icon pattern
 */
export function getTripGradientPattern(tripName: string): TripGradientPattern {
  const theme = detectTheme(tripName)
  const themeData = THEMES[theme]

  // Select gradient deterministically based on trip name
  const gradientIndex =
    Math.abs(tripName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
    themeData.gradients.length

  const gradient = themeData.gradients[gradientIndex]

  // Generate 3-4 icons deterministically
  const iconCount = 3 + Math.floor(seededRandom(tripName, 0) * 2)
  const icons = []

  for (let i = 0; i < iconCount; i++) {
    const iconIndex = Math.floor(seededRandom(tripName, i) * themeData.icons.length)
    const Icon = themeData.icons[iconIndex]

    icons.push({
      Icon,
      x: 10 + seededRandom(tripName, i * 10) * 80, // 10-90% positioning
      y: 10 + seededRandom(tripName, i * 11) * 80, // 10-90% positioning
      size: 80 + seededRandom(tripName, i * 12) * 60, // 80-140px
      rotation: -20 + seededRandom(tripName, i * 13) * 40, // -20 to +20 degrees
      opacity: 0.06 + seededRandom(tripName, i * 14) * 0.08, // 0.06-0.14 (subtle)
    })
  }

  return { gradient, icons, theme }
}
