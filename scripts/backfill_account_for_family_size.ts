/**
 * Backfill: set trips.account_for_family_size = true for families-mode trips
 * where the majority of expenses use distribution.accountForFamilySize = true.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Get all families-mode trips
  const { data: trips, error: tripError } = await supabase
    .from('trips')
    .select('id, name, tracking_mode')
    .eq('tracking_mode', 'families')

  if (tripError || !trips) {
    console.error('Failed to fetch trips:', tripError)
    process.exit(1)
  }

  console.log(`Found ${trips.length} families-mode trips`)

  for (const trip of trips) {
    // Get all expenses for this trip
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('id, distribution')
      .eq('trip_id', trip.id)

    if (expError || !expenses) {
      console.error(`Failed to fetch expenses for trip ${trip.name}:`, expError)
      continue
    }

    const familiesExpenses = expenses.filter(
      (e: any) => e.distribution?.type === 'families' || e.distribution?.type === 'mixed'
    )

    if (familiesExpenses.length === 0) {
      console.log(`  ${trip.name}: no families/mixed expenses, skipping`)
      continue
    }

    const withFlag = familiesExpenses.filter(
      (e: any) => e.distribution?.accountForFamilySize === true
    )

    const majority = withFlag.length > familiesExpenses.length / 2
    console.log(`  ${trip.name}: ${withFlag.length}/${familiesExpenses.length} expenses have accountForFamilySize=true → ${majority ? 'SET TRUE' : 'KEEP FALSE'}`)

    if (majority) {
      const { error: updateError } = await supabase
        .from('trips')
        .update({ account_for_family_size: true })
        .eq('id', trip.id)

      if (updateError) {
        console.error(`  Failed to update trip ${trip.name}:`, updateError)
      } else {
        console.log(`  ✅ Updated ${trip.name} account_for_family_size = true`)
      }
    }
  }

  console.log('\nDone.')
}

main()
