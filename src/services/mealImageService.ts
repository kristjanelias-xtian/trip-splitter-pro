/**
 * Meal Image Service
 * Fetches food photos from Unsplash API with localStorage caching
 */

import { MealWithIngredients } from '@/types/meal'

export interface MealPhoto {
  url: string
  thumbnailUrl: string
  photographer: string
  photographerUrl: string
  fallback: boolean
}

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
const CACHE_PREFIX = 'meal-photo-'
const CACHE_DURATION_DAYS = 30

// Fallback gradients for when photos aren't available
const FALLBACK_GRADIENTS = [
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

interface CachedPhoto {
  photo: MealPhoto
  timestamp: number
}

/**
 * Generates a cache key for a date
 */
function getCacheKey(date: string): string {
  return `${CACHE_PREFIX}${date}`
}

/**
 * Checks if cached photo is still valid
 */
function isCacheValid(cached: CachedPhoto): boolean {
  const now = Date.now()
  const dayInMs = 1000 * 60 * 60 * 24
  const expiryTime = cached.timestamp + (CACHE_DURATION_DAYS * dayInMs)
  return now < expiryTime
}

/**
 * Gets photo from localStorage cache
 */
function getFromCache(date: string): MealPhoto | null {
  try {
    const cached = localStorage.getItem(getCacheKey(date))
    if (!cached) return null

    const parsed: CachedPhoto = JSON.parse(cached)
    if (isCacheValid(parsed)) {
      return parsed.photo
    }

    // Cache expired, remove it
    localStorage.removeItem(getCacheKey(date))
    return null
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

/**
 * Saves photo to localStorage cache
 */
function saveToCache(date: string, photo: MealPhoto): void {
  try {
    const cached: CachedPhoto = {
      photo,
      timestamp: Date.now()
    }
    localStorage.setItem(getCacheKey(date), JSON.stringify(cached))
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

/**
 * Generates a deterministic fallback gradient based on date
 */
function getFallbackGradient(date: string): string {
  // Use date to deterministically select gradient
  const sum = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = sum % FALLBACK_GRADIENTS.length
  return FALLBACK_GRADIENTS[index]
}

/**
 * Creates a fallback photo object with gradient background
 */
function createFallbackPhoto(date: string): MealPhoto {
  return {
    url: getFallbackGradient(date),
    thumbnailUrl: getFallbackGradient(date),
    photographer: '',
    photographerUrl: '',
    fallback: true
  }
}

/**
 * Builds search query from meal titles
 */
function buildSearchQuery(meals: MealWithIngredients[]): string {
  if (meals.length === 0) {
    return 'food preparation'
  }

  // Get the most prominent meal (one with most ingredients or first one)
  const sortedMeals = [...meals].sort((a, b) =>
    b.ingredients_total - a.ingredients_total
  )
  const primaryMeal = sortedMeals[0]

  // Extract key food words from title (remove common words)
  const commonWords = ['with', 'and', 'the', 'a', 'an', 'for', 'to', 'in', 'on']
  const words = primaryMeal.title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => !commonWords.includes(word) && word.length > 2)

  // Use first 2-3 words for search query
  const query = words.slice(0, 3).join(' ') || primaryMeal.title

  return `${query} food`
}

/**
 * Fetches a photo from Unsplash API
 */
async function fetchFromUnsplash(query: string): Promise<MealPhoto | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn('Unsplash API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    )

    if (!response.ok) {
      if (response.status === 403) {
        console.warn('Unsplash API rate limit exceeded')
      }
      return null
    }

    const data = await response.json()

    return {
      url: data.urls.regular,
      thumbnailUrl: data.urls.small,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      fallback: false
    }
  } catch (error) {
    console.error('Error fetching from Unsplash:', error)
    return null
  }
}

/**
 * Gets or fetches a photo for a specific day
 * @param date - ISO date string (YYYY-MM-DD)
 * @param meals - Meals for this day
 * @returns Promise<MealPhoto>
 */
export async function getMealPhoto(
  date: string,
  meals: MealWithIngredients[]
): Promise<MealPhoto> {
  // Check cache first
  const cached = getFromCache(date)
  if (cached) {
    return cached
  }

  // Build search query from meals
  const query = buildSearchQuery(meals)

  // Try to fetch from Unsplash
  const photo = await fetchFromUnsplash(query)

  if (photo) {
    // Save to cache and return
    saveToCache(date, photo)
    return photo
  }

  // Fallback to gradient
  const fallbackPhoto = createFallbackPhoto(date)
  saveToCache(date, fallbackPhoto)
  return fallbackPhoto
}

/**
 * Preloads photos for multiple days
 * @param dates - Array of date strings with their meals
 */
export async function preloadMealPhotos(
  dates: Array<{ date: string; meals: MealWithIngredients[] }>
): Promise<void> {
  // Limit concurrent requests to avoid rate limiting
  const BATCH_SIZE = 3

  for (let i = 0; i < dates.length; i += BATCH_SIZE) {
    const batch = dates.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(({ date, meals }) => getMealPhoto(date, meals))
    )

    // Small delay between batches
    if (i + BATCH_SIZE < dates.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

/**
 * Clears all cached photos (useful for testing or manual refresh)
 */
export function clearPhotoCache(): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}
