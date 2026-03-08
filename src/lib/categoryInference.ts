// SPDX-License-Identifier: Apache-2.0
import type { ExpenseCategory } from '@/types/expense'

const CATEGORY_KEYWORDS: Record<Exclude<ExpenseCategory, 'Other'>, string[]> = {
  Food: [
    'restaurant', 'dinner', 'lunch', 'breakfast', 'café', 'cafe', 'coffee',
    'groceries', 'pizza', 'burger', 'snack', 'bar', 'drinks', 'food',
    'bakery', 'kebab', 'sushi', 'brunch', 'beer', 'wine', 'ice cream',
    'gelato', 'supermarket', 'market', 'deli',
    // Estonian
    'restoran', 'õhtusöök', 'lõunasöök', 'hommikusöök', 'kohv', 'kohvik',
    'toidupood', 'snäkk', 'joogid', 'toit', 'pagariäri', 'õlu', 'vein',
    'jäätis', 'pood', 'söök', 'eine', 'turg',
  ],
  Accommodation: [
    'hotel', 'airbnb', 'hostel', 'apartment', 'villa', 'rent', 'booking',
    'stay', 'resort', 'lodge', 'cabin', 'motel', 'bnb', 'accommodation',
    // Estonian
    'hotell', 'hostel', 'korter', 'majutus', 'üür', 'puhkemaja',
    'suvila', 'maamaja', 'ööbimine',
  ],
  Transport: [
    'taxi', 'uber', 'bus', 'train', 'flight', 'fuel', 'gas', 'petrol',
    'parking', 'ferry', 'metro', 'lyft', 'car', 'rental', 'transfer',
    'toll', 'highway', 'grab', 'bolt',
    // Estonian
    'takso', 'buss', 'rong', 'lend', 'lennuk', 'kütus', 'bensiin',
    'parkimine', 'praam', 'auto', 'rent', 'teemaks', 'maantee',
  ],
  Activities: [
    'museum', 'tour', 'ticket', 'excursion', 'hike', 'ski', 'surf',
    'dive', 'concert', 'show', 'entrance', 'cinema', 'spa', 'massage',
    'sauna', 'pool', 'golf', 'boat', 'kayak', 'zip', 'climb',
    'theme park', 'zoo', 'aquarium', 'attraction',
    // Estonian
    'muuseum', 'ekskursioon', 'pilet', 'matk', 'suusatamine', 'kontsert',
    'etendus', 'kino', 'massaaž', 'bassein', 'paat', 'loomaaed',
    'akvaarium', 'vaatamisväärsus', 'tegevus',
  ],
  Training: [
    'gym', 'workout', 'yoga', 'lesson', 'class', 'coach', 'instructor',
    'training', 'session', 'course', 'personal trainer',
    // Estonian
    'jõusaal', 'trenn', 'treening', 'tund', 'kursus', 'treener',
    'juhendaja', 'õppetund',
  ],
}

/**
 * Infer an expense category from a description using keyword matching.
 * Returns null when no confident match is found.
 */
export function inferCategory(description: string): ExpenseCategory | null {
  if (!description || description.trim().length < 2) return null

  const lower = description.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as ExpenseCategory
      }
    }
  }

  return null
}
