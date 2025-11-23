/**
 * Script to generate trip_code for all existing trips in the database
 * Run this once after adding the trip_code column
 *
 * Usage: npx tsx scripts/generate-trip-codes.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { generateTripCode } from '../src/lib/tripCodeGenerator'

// Load environment variables
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateTripCodes() {
  console.log('🔄 Fetching trips without trip_code...')

  // Get all trips that don't have a trip_code yet
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .is('trip_code', null)

  if (error) {
    console.error('❌ Error fetching trips:', error)
    return
  }

  if (!trips || trips.length === 0) {
    console.log('✅ All trips already have trip_codes!')
    return
  }

  console.log(`📝 Found ${trips.length} trips without trip_code`)

  for (const trip of trips) {
    const tripCode = generateTripCode(trip.name)

    console.log(`  Generating code for "${trip.name}": ${tripCode}`)

    const { error: updateError } = await supabase
      .from('trips')
      .update({ trip_code: tripCode })
      .eq('id', trip.id)

    if (updateError) {
      console.error(`  ❌ Error updating trip ${trip.id}:`, updateError)
    } else {
      console.log(`  ✅ Updated trip ${trip.id}`)
    }
  }

  console.log('\n🎉 Done! All trips now have trip_codes.')
}

generateTripCodes().catch(console.error)
