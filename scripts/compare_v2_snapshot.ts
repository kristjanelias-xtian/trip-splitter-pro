/**
 * Compare V1 balance snapshot with V2 calculator output.
 * Loads balance_snapshot_pre.json, fetches live data from Supabase,
 * runs calculateBalancesV2, compares by entity name.
 *
 * Run: npx tsx --tsconfig tsconfig.json scripts/compare_v2_snapshot.ts
 */

import { createClient } from '@supabase/supabase-js'
import { calculateBalancesV2 } from '../src/services/balanceCalculator'
import type { Expense } from '../src/types/expense'
import type { Participant, Family } from '../src/types/participant'
import type { Settlement } from '../src/types/settlement'
import { readFileSync, writeFileSync } from 'fs'

const supabase = createClient(
  'https://kojngcoxywrhpxokkuuv.supabase.co',
  'sb_publishable_EXi_3UU-nVDdw4Tw8G3jkA_I2uD6FFh'
)

interface SnapshotBalance {
  id: string
  name: string
  totalPaid: number
  totalShare: number
  balance: number
  isFamily: boolean
}

interface TripSnapshot {
  trip_id: string
  trip_name: string
  tracking_mode: string
  balances: SnapshotBalance[]
  totalExpenses: number
}

interface Snapshot {
  snapshot_date: string
  calculator_version: string
  trips: TripSnapshot[]
}

async function main() {
  // Load V1 snapshot
  const raw = readFileSync('balance_snapshot_pre.json', 'utf-8')
  const snapshot: Snapshot = JSON.parse(raw)
  console.log(`Loaded V1 snapshot from ${snapshot.snapshot_date} (${snapshot.trips.length} trips)`)

  let totalDiscrepancies = 0
  const v2Snapshots: TripSnapshot[] = []

  for (const v1Trip of snapshot.trips) {
    // Fetch live data for this trip
    const [participantsRes, familiesRes, expensesRes, settlementsRes] = await Promise.all([
      supabase.from('participants').select('*').eq('trip_id', v1Trip.trip_id),
      supabase.from('families').select('*').eq('trip_id', v1Trip.trip_id),
      supabase.from('expenses').select('*').eq('trip_id', v1Trip.trip_id),
      supabase.from('settlements').select('*').eq('trip_id', v1Trip.trip_id),
    ])

    if (participantsRes.error || familiesRes.error || expensesRes.error || settlementsRes.error) {
      console.error(`  ERROR fetching data for ${v1Trip.trip_name}`)
      continue
    }

    const participants = participantsRes.data as Participant[]
    const families = familiesRes.data as Family[]
    const expenses = expensesRes.data as Expense[]
    const settlements = settlementsRes.data as Settlement[]

    // Fetch trip for currency info
    const { data: tripData } = await supabase
      .from('trips')
      .select('default_currency, exchange_rates')
      .eq('id', v1Trip.trip_id)
      .single()

    const trackingMode = (v1Trip.tracking_mode || 'individuals') as 'individuals' | 'families'
    const defaultCurrency = tripData?.default_currency || 'EUR'
    const exchangeRates = (tripData?.exchange_rates || {}) as Record<string, number>

    // Run V2
    const v2Result = calculateBalancesV2(
      expenses,
      participants,
      families,
      trackingMode,
      settlements,
      defaultCurrency,
      exchangeRates
    )

    // Compare by entity name
    let tripDiscrepancies = 0
    const v1ByName = new Map(v1Trip.balances.map(b => [b.name, b]))
    const v2ByName = new Map(v2Result.balances.map(b => [b.name, b]))

    // Check all V1 entities exist in V2 with matching values
    for (const [name, v1Balance] of v1ByName) {
      const v2Balance = v2ByName.get(name)
      if (!v2Balance) {
        console.error(`  MISSING in V2: ${name} (trip: ${v1Trip.trip_name})`)
        tripDiscrepancies++
        continue
      }

      const fields: Array<[string, number, number]> = [
        ['totalPaid', v1Balance.totalPaid, Math.round(v2Balance.totalPaid * 100) / 100],
        ['totalShare', v1Balance.totalShare, Math.round(v2Balance.totalShare * 100) / 100],
        ['balance', v1Balance.balance, Math.round(v2Balance.balance * 100) / 100],
      ]

      for (const [field, v1Val, v2Val] of fields) {
        if (Math.abs(v1Val - v2Val) > 0.01) {
          console.error(`  MISMATCH ${v1Trip.trip_name} / ${name} / ${field}: V1=${v1Val}, V2=${v2Val}`)
          tripDiscrepancies++
        }
      }
    }

    // Check for extra entities in V2
    for (const [name] of v2ByName) {
      if (!v1ByName.has(name)) {
        console.error(`  EXTRA in V2: ${name} (trip: ${v1Trip.trip_name})`)
        tripDiscrepancies++
      }
    }

    // Check total expenses
    const v2Total = Math.round(v2Result.totalExpenses * 100) / 100
    if (Math.abs(v1Trip.totalExpenses - v2Total) > 0.01) {
      console.error(`  MISMATCH ${v1Trip.trip_name} / totalExpenses: V1=${v1Trip.totalExpenses}, V2=${v2Total}`)
      tripDiscrepancies++
    }

    const status = tripDiscrepancies === 0 ? '✓' : `✗ (${tripDiscrepancies} discrepancies)`
    console.log(`  ${v1Trip.trip_name}: ${status}`)
    totalDiscrepancies += tripDiscrepancies

    // Build V2 snapshot entry
    v2Snapshots.push({
      trip_id: v1Trip.trip_id,
      trip_name: v1Trip.trip_name,
      tracking_mode: trackingMode,
      balances: v2Result.balances.map(b => ({
        id: b.id,
        name: b.name,
        totalPaid: Math.round(b.totalPaid * 100) / 100,
        totalShare: Math.round(b.totalShare * 100) / 100,
        balance: Math.round(b.balance * 100) / 100,
        isFamily: b.isFamily,
      })),
      totalExpenses: v2Total,
    })
  }

  console.log(`\nTotal discrepancies: ${totalDiscrepancies}`)

  // Save V2 snapshot
  const v2Output = {
    snapshot_date: new Date().toISOString(),
    calculator_version: 'v2',
    trips: v2Snapshots,
  }
  writeFileSync('balance_snapshot_v2.json', JSON.stringify(v2Output, null, 2))
  console.log('V2 snapshot saved to balance_snapshot_v2.json')

  if (totalDiscrepancies > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
