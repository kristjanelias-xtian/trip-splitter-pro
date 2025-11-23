import { customAlphabet } from 'nanoid'

/**
 * Generate a 6-character random hash for trip codes
 * Character set: 0-9a-zA-Z (62 possible characters per position)
 * Results in 62^6 = 56+ billion possible combinations
 */
const generateTripHash = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  6
)

/**
 * Create a URL-friendly slug from trip name
 * - Converts to lowercase
 * - Replaces non-alphanumeric chars with hyphens
 * - Removes leading/trailing hyphens
 * - Max 30 characters
 *
 * @param tripName - The trip name to slugify
 * @returns URL-friendly slug
 *
 * @example
 * createTripSlug("Summer 2025") // "summer-2025"
 * createTripSlug("Beach Trip!") // "beach-trip"
 */
export function createTripSlug(tripName: string): string {
  return tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

/**
 * Generate a complete trip code: slug-hash
 *
 * @param tripName - The trip name to generate code from
 * @returns Complete trip code (e.g., "summer-2025-a3x9k2")
 *
 * @example
 * generateTripCode("Summer 2025") // "summer-2025-a3x9k2"
 * generateTripCode("Ski Weekend") // "ski-weekend-q7r2v5"
 */
export function generateTripCode(tripName: string): string {
  const slug = createTripSlug(tripName)
  const hash = generateTripHash()
  return `${slug}-${hash}`
}

/**
 * Extract trip code from a full URL
 *
 * @param url - Full URL or just the trip code
 * @returns Extracted trip code or null if invalid
 *
 * @example
 * extractTripCodeFromUrl("https://split.xtian.me/t/summer-2025-a3x9k2")
 * // Returns: "summer-2025-a3x9k2"
 *
 * extractTripCodeFromUrl("summer-2025-a3x9k2")
 * // Returns: "summer-2025-a3x9k2"
 */
export function extractTripCodeFromUrl(url: string): string | null {
  // Handle full URLs
  if (url.includes('/t/')) {
    const match = url.match(/\/t\/([a-z0-9-]+-[a-zA-Z0-9]{6})/)
    return match ? match[1] : null
  }

  // Handle direct trip codes
  if (isValidTripCode(url)) {
    return url
  }

  return null
}

/**
 * Validate trip code format
 * Format: slugified-name-XXXXXX where X is alphanumeric (case-sensitive)
 *
 * @param code - Trip code to validate
 * @returns True if valid format
 *
 * @example
 * isValidTripCode("summer-2025-a3x9k2") // true
 * isValidTripCode("invalid") // false
 */
export function isValidTripCode(code: string): boolean {
  const regex = /^[a-z0-9-]+-[a-zA-Z0-9]{6}$/
  return regex.test(code)
}

/**
 * Generate full shareable URL for a trip
 *
 * @param tripCode - The trip code
 * @param baseUrl - Optional base URL (defaults to window.location.origin)
 * @returns Full shareable URL
 *
 * @example
 * generateShareableUrl("summer-2025-a3x9k2")
 * // Returns: "https://split.xtian.me/t/summer-2025-a3x9k2"
 */
export function generateShareableUrl(tripCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/t/${tripCode}`
}
