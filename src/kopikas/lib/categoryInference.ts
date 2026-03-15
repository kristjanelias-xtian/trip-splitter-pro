// SPDX-License-Identifier: Apache-2.0
import type { KopikasCategory } from '../types'

const KEYWORD_MAP: [KopikasCategory, string[]][] = [
  ['sweets', ['komm', 'šokolaad', 'chocolate', 'candy', 'haribo', 'jäätis', 'ice cream', 'kook', 'cake', 'küpsis', 'cookie', 'maiustus', 'lollipop', 'gummy', 'chips', 'krõps']],
  ['food', ['pizza', 'burger', 'söök', 'lõuna', 'lunch', 'dinner', 'breakfast', 'hommik', 'õhtu', 'toit', 'leib', 'piim', 'milk', 'bread', 'sushi', 'pasta', 'supp', 'soup', 'salat', 'salad', 'kohv', 'coffee', 'tee', 'juice', 'mahl']],
  ['clothes', ['pluus', 'shirt', 'dress', 'kleit', 'sokid', 'socks', 'müts', 'hat', 'jakk', 'jacket', 'riided', 'shoes', 'kingad', 'pants', 'püksid', 'hoodie']],
  ['beauty', ['huulepulk', 'lipstick', 'lip gloss', 'kreem', 'cream', 'parfüüm', 'perfume', 'lõhn', 'küünelakk', 'nail polish', 'šampoon', 'shampoo', 'mask', 'ilu']],
  ['fun', ['mäng', 'game', 'kino', 'movie', 'film', 'pilet', 'ticket', 'park', 'lõbu', 'toy', 'mänguasi', 'roblox', 'steam', 'netflix']],
  ['school', ['vihik', 'notebook', 'pliiats', 'pencil', 'pen', 'pastakas', 'kustutuskumm', 'eraser', 'koolikott', 'backpack', 'raamat', 'book', 'kool', 'school', 'õpik', 'textbook']],
  ['gifts', ['kink', 'gift', 'present', 'sünnipäev', 'birthday', 'kaart', 'card']],
  ['charity', ['annetus', 'donation', 'heategevus', 'charity', 'annetama']],
]

export function inferKopikasCategory(description: string): KopikasCategory | null {
  const lower = description.toLowerCase()
  for (const [category, keywords] of KEYWORD_MAP) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category
    }
  }
  return null
}
