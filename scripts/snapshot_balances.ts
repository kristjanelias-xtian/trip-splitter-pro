/**
 * Snapshot all trip balances using the current (V1) balance calculator.
 * Output: balance_snapshot_pre.json
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/snapshot_balances.ts
 */

import { createClient } from '@supabase/supabase-js'
import { calculateBalances } from '../src/services/balanceCalculator'
import type { Expense } from '../src/types/expense'
import type { Participant, Family } from '../src/types/participant'
import type { Settlement } from '../src/types/settlement'
import { writeFileSync } from 'fs'

const supabase = createClient(
  'https://kojngcoxywrhpxokkuuv.supabase.co',
  'sb_publishable_EXi_3UU-nVDdw4Tw8G3jkA_I2uD6FFh'
)

interface TripSnapshot {
  trip_id: string
  trip_name: string
  tracking_mode: string
  balances: Array<{
    id: string
    name: string
    totalPaid: number
    totalShare: number
    balance: number
    isFamily: boolean
  }>
  totalExpenses: number
}

async function main() {
  // Fetch all trips
  const { data: trips, error: tripErr } = await supabase
    .from('trips')
    .select('id, name, tracking_mode, default_currency, exchange_rates')

  if (tripErr) {
    console.error('Error fetching trips:', tripErr)
    process.exit(1)
  }

  console.log(`Found ${trips.length} trips`)

  const tripSnapshots: TripSnapshot[] = []

  for (const trip of trips) {
    // Fetch participants, families, expenses, settlements for this trip
    const [participantsRes, familiesRes, expensesRes, settlementsRes] = await Promise.all([
      supabase.from('participants').select('*').eq('trip_id', trip.id),
      supabase.from('families').select('*').eq('trip_id', trip.id),
      supabase.from('expenses').select('*').eq('trip_id', trip.id),
      supabase.from('settlements').select('*').eq('trip_id', trip.id),
    ])

    if (participantsRes.error || familiesRes.error || expensesRes.error || settlementsRes.error) {
      console.error(`Error fetching data for trip ${trip.name}:`, {
        participants: participantsRes.error,
        families: familiesRes.error,
        expenses: expensesRes.error,
        settlements: settlementsRes.error,
      })
      continue
    }

    const participants = participantsRes.data as Participant[]
    const families = familiesRes.data as Family[]
    const expenses = expensesRes.data as Expense[]
    const settlements = settlementsRes.data as Settlement[]

    const trackingMode = (trip.tracking_mode || 'individuals') as 'individuals' | 'families'
    const defaultCurrency = trip.default_currency || 'EUR'
    const exchangeRates = (trip.exchange_rates || {}) as Record<string, number>

    const result = calculateBalances(
      expenses,
      participants,
      families,
      trackingMode,
      settlements,
      defaultCurrency,
      exchangeRates
    )

    const snapshot: TripSnapshot = {
      trip_id: trip.id,
      trip_name: trip.name,
      tracking_mode: trackingMode,
      balances: result.balances.map(b => ({
        id: b.id,
        name: b.name,
        totalPaid: Math.round(b.totalPaid * 100) / 100,
        totalShare: Math.round(b.totalShare * 100) / 100,
        balance: Math.round(b.balance * 100) / 100,
        isFamily: b.isFamily,
      })),
      totalExpenses: Math.round(result.totalExpenses * 100) / 100,
    }

    tripSnapshots.push(snapshot)
    console.log(`  ${trip.name}: ${expenses.length} expenses, ${participants.length} participants, ${families.length} families, mode=${trackingMode}`)
  }

  const output = {
    snapshot_date: new Date().toISOString(),
    calculator_version: 'v1',
    trips: tripSnapshots,
  }

  const outPath = 'balance_snapshot_pre.json'
  writeFileSync(outPath, JSON.stringify(output, null, 2))
  console.log(`\nSnapshot written to ${outPath}`)
  console.log(`Total trips: ${tripSnapshots.length}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
