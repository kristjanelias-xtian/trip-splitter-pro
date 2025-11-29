/**
 * Gradient Service with Food-Themed Patterns
 * Generates deterministic gradient backgrounds with food icon overlays
 */

import type { LucideIcon } from 'lucide-react'
import {
  Utensils,
  Coffee,
  Apple,
  Pizza,
  Cookie,
  Salad,
  Fish,
  IceCream,
} from 'lucide-react'

export interface GradientPattern {
  gradient: string
  icons: Array<{
    Icon: LucideIcon
    x: number // percentage 0-100
    y: number // percentage 0-100
    size: number // pixels
    rotation: number // degrees
    opacity: number
  }>
}

const GRADIENTS = [
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
]

const FOOD_ICONS = [
  Utensils,
  Coffee,
  Apple,
  Pizza,
  Cookie,
  Salad,
  Fish,
  IceCream,
]

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
 * Gets gradient pattern for a specific date
 * Same date always returns same gradient + icon pattern
 */
export function getGradientPattern(date: string): GradientPattern {
  // Select gradient deterministically based on date
  const gradientIndex =
    Math.abs(date.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) %
    GRADIENTS.length

  const gradient = GRADIENTS[gradientIndex]

  // Generate 3-5 icons deterministically
  const iconCount = 3 + Math.floor(seededRandom(date, 0) * 3)
  const icons = []

  for (let i = 0; i < iconCount; i++) {
    const iconIndex = Math.floor(seededRandom(date, i) * FOOD_ICONS.length)
    const Icon = FOOD_ICONS[iconIndex]

    icons.push({
      Icon,
      x: 10 + seededRandom(date, i * 10) * 80, // 10-90%
      y: 10 + seededRandom(date, i * 11) * 80, // 10-90%
      size: 80 + seededRandom(date, i * 12) * 40, // 80-120px
      rotation: -15 + seededRandom(date, i * 13) * 30, // -15 to +15 degrees
      opacity: 0.1 + seededRandom(date, i * 14) * 0.1, // 0.1-0.2
    })
  }

  return { gradient, icons }
}
