// SPDX-License-Identifier: Apache-2.0
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
      'linear-gradient(150deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',  // Deep Ocean
      'linear-gradient(135deg, #c94b4b 0%, #b33771 50%, #4a247c 100%)',  // Coral Reef
      'linear-gradient(160deg, #1a1a2e 0%, #e65c00 50%, #f5af19 100%)',  // Tropical Sunset
      'linear-gradient(120deg, #00b4db 0%, #0083b0 45%, #2e1065 100%)',  // Lagoon
      'linear-gradient(140deg, #134e5e 0%, #1a8a6e 50%, #0d3b66 100%)',  // Seafoam Night
      'linear-gradient(130deg, #e65c00 0%, #d45088 40%, #6441a5 100%)',  // Island Dusk
    ],
    icons: [Palmtree, Waves, Sun, Fish, Shell],
  },
  mountain: {
    keywords: ['mountain', 'alps', 'hiking', 'trek', 'hill', 'peak', 'valley'],
    gradients: [
      'linear-gradient(145deg, #1a1a2e 0%, #16213e 35%, #1b4332 70%, #2d6a4f 100%)',  // Alpine Twilight
      'linear-gradient(155deg, #b45309 0%, #92400e 50%, #44403c 100%)',  // Summit Glow
      'linear-gradient(130deg, #065f46 0%, #047857 40%, #064e3b 100%)',  // Forest Depth
      'linear-gradient(160deg, #1e1e2f 0%, #3b4371 50%, #5b4a8a 100%)',  // Mountain Storm
      'linear-gradient(140deg, #3d5a3e 0%, #1b6b6d 50%, #111827 100%)',  // Ridgeline
    ],
    icons: [Mountain, Trees, TreePine],
  },
  ski: {
    keywords: ['ski', 'snow', 'winter', 'himos', 'levi', 'alps', 'whistler', 'aspen', 'slope'],
    gradients: [
      'linear-gradient(135deg, #0c1445 0%, #0e6ba8 40%, #6b21a8 100%)',  // Northern Lights
      'linear-gradient(150deg, #0f172a 0%, #1e3a5f 45%, #3b82f6 100%)',  // Black Diamond
      'linear-gradient(120deg, #0a1628 0%, #1e40af 50%, #0ea5e9 100%)',  // Powder Blue
      'linear-gradient(145deg, #1e1b4b 0%, #4338ca 50%, #2563eb 100%)',  // Frostbite
      'linear-gradient(160deg, #042f2e 0%, #155e75 45%, #22d3ee 100%)',  // Glacier
    ],
    icons: [CloudSnow, Snowflake, Mountain, TreePine],
  },
  city: {
    keywords: ['city', 'urban', 'paris', 'london', 'tokyo', 'york', 'berlin', 'rome', 'barcelona', 'amsterdam'],
    gradients: [
      'linear-gradient(135deg, #1a1a2e 0%, #6b21a8 50%, #db2777 100%)',  // Neon Noir
      'linear-gradient(150deg, #111827 0%, #374151 40%, #d97706 100%)',  // Metropolitan
      'linear-gradient(140deg, #7c3aed 0%, #ec4899 50%, #f97316 100%)',  // City Lights
      'linear-gradient(125deg, #2e1065 0%, #9333ea 40%, #be123c 100%)',  // Nightlife
      'linear-gradient(155deg, #1c1917 0%, #334155 50%, #475569 100%)',  // Urban Steel
      'linear-gradient(135deg, #44403c 0%, #a16207 50%, #c2410c 100%)',  // Golden Hour
    ],
    icons: [Building2, Landmark, Coffee, ShoppingBag, Camera],
  },
  generic: {
    keywords: [],
    gradients: [
      'linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #c026d3 100%)',  // Ultraviolet
      'linear-gradient(150deg, #7f1d1d 0%, #dc2626 45%, #f59e0b 100%)',  // Ember
      'linear-gradient(120deg, #0c1445 0%, #0d9488 50%, #06b6d4 100%)',  // Deep Sea
      'linear-gradient(140deg, #1a1a2e 0%, #be185d 50%, #f472b6 100%)',  // Midnight Rose
      'linear-gradient(130deg, #052e16 0%, #059669 50%, #4ade80 100%)',  // Emerald Dark
      'linear-gradient(155deg, #0f172a 0%, #475569 50%, #64748b 100%)',  // Slate Storm
      'linear-gradient(145deg, #1c1917 0%, #b91c1c 45%, #c2410c 100%)',  // Crimson Night
      'linear-gradient(160deg, #2e1065 0%, #4f46e5 45%, #3b82f6 100%)',  // Electric Indigo
      'linear-gradient(135deg, #292524 0%, #b45309 50%, #d97706 100%)',  // Copper Dusk
      'linear-gradient(125deg, #064e3b 0%, #0891b2 50%, #2563eb 100%)',  // Aurora
      'linear-gradient(150deg, #18181b 0%, #991b1b 50%, #ea580c 100%)',  // Volcanic
      'linear-gradient(140deg, #172554 0%, #1d4ed8 50%, #60a5fa 100%)',  // Sapphire
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
