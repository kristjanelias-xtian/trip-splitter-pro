/**
 * Seed a realistic demo trip: "Livigno Ski Trip 2025"
 *
 * Creates 6 participants (2 couples with wallet_groups, 2 solo)
 * and 13 expenses across 5 days.
 *
 * Idempotent — safe to run multiple times (checks for existing trip_code).
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx \
 *     npx tsx scripts/seed-demo-trip.ts
 */

import { createClient } from '@supabase/supabase-js'

const TRIP_CODE = 'livigno-2025'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing env vars. Usage:\n' +
      '  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/seed-demo-trip.ts'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 1. Idempotency check
  console.log(`Checking for existing trip (trip_code = '${TRIP_CODE}')...`)
  const { data: existing, error: checkErr } = await supabase
    .from('trips')
    .select('id')
    .eq('trip_code', TRIP_CODE)
    .maybeSingle()

  if (checkErr) {
    console.error('Error checking for existing trip:', checkErr)
    process.exit(1)
  }

  if (existing) {
    console.log(`Trip '${TRIP_CODE}' already exists (id: ${existing.id}). Nothing to do.`)
    process.exit(0)
  }

  // 2. Create trip
  console.log('Creating trip...')
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      name: 'Livigno Ski Trip 2025',
      date: '2025-02-15',
      tracking_mode: 'individuals',
      trip_code: TRIP_CODE,
      default_currency: 'EUR',
      exchange_rates: {},
      enable_meals: false,
      enable_shopping: false,
      enable_activities: false,
      default_split_all: true,
      account_for_family_size: false,
      created_by: null,
    })
    .select('id')
    .single()

  if (tripErr || !trip) {
    console.error('Error creating trip:', tripErr)
    process.exit(1)
  }

  const tripId = trip.id
  console.log(`  Trip created: ${tripId}`)

  // 3. Create participants
  console.log('Creating participants...')
  const participantRows = [
    { name: 'Marta', wallet_group: 'Marta & Joonas' },
    { name: 'Joonas', wallet_group: 'Marta & Joonas' },
    { name: 'Sara', wallet_group: 'Sara & Tom' },
    { name: 'Tom', wallet_group: 'Sara & Tom' },
    { name: 'Luca', wallet_group: null },
    { name: 'Elena', wallet_group: null },
  ]

  const { data: participants, error: partErr } = await supabase
    .from('participants')
    .insert(participantRows.map((p) => ({ ...p, trip_id: tripId, is_adult: true })))
    .select('id, name')

  if (partErr || !participants) {
    console.error('Error creating participants:', partErr)
    process.exit(1)
  }

  const nameToId: Record<string, string> = {}
  for (const p of participants) {
    nameToId[p.name] = p.id
    console.log(`  ${p.name}: ${p.id}`)
  }

  const allIds = participants.map((p) => p.id)

  // Helper to build distribution
  const dist = (ids: string[] = allIds) => ({
    type: 'individuals' as const,
    participants: ids,
    splitMode: 'equal' as const,
  })

  // 4. Create expenses
  console.log('Creating expenses...')
  const expenses = [
    // Day 1 — Sat 15 Feb
    {
      description: 'Grocery run (Eurospin)',
      amount: 87.4,
      paid_by: nameToId['Marta'],
      expense_date: '2025-02-15',
      category: 'groceries',
      comment: 'Snacks, drinks, breakfast supplies',
    },
    {
      description: 'Ski pass 6-day (group deal)',
      amount: 1140.0,
      paid_by: nameToId['Luca'],
      expense_date: '2025-02-15',
      category: 'activities',
      comment: '6 x 190 EUR',
    },

    // Day 2 — Sun 16 Feb
    {
      description: 'Lunch at Ristorante Camanel',
      amount: 162.0,
      paid_by: nameToId['Sara'],
      expense_date: '2025-02-16',
      category: 'food',
      comment: null,
    },
    {
      description: 'Beers at Tea del Vidal',
      amount: 48.0,
      paid_by: nameToId['Tom'],
      expense_date: '2025-02-16',
      category: 'drinks',
      comment: '8 craft beers',
    },

    // Day 3 — Mon 17 Feb
    {
      description: 'Ski lesson (Elena)',
      amount: 65.0,
      paid_by: nameToId['Elena'],
      expense_date: '2025-02-17',
      category: 'activities',
      comment: '2h group lesson',
      _split: [nameToId['Elena']],
    },
    {
      description: 'Pizza dinner at Bivio',
      amount: 108.5,
      paid_by: nameToId['Joonas'],
      expense_date: '2025-02-17',
      category: 'food',
      comment: null,
    },

    // Day 4 — Tue 18 Feb
    {
      description: 'Grocery top-up (Spar)',
      amount: 52.3,
      paid_by: nameToId['Elena'],
      expense_date: '2025-02-18',
      category: 'groceries',
      comment: null,
    },
    {
      description: 'Aperitivo at Kosto',
      amount: 72.0,
      paid_by: nameToId['Marta'],
      expense_date: '2025-02-18',
      category: 'drinks',
      comment: null,
    },
    {
      description: 'Wellness / spa entry',
      amount: 150.0,
      paid_by: nameToId['Sara'],
      expense_date: '2025-02-18',
      category: 'activities',
      comment: '5 entries at Aquagranda',
      _split: [
        nameToId['Marta'],
        nameToId['Joonas'],
        nameToId['Sara'],
        nameToId['Tom'],
        nameToId['Elena'],
      ],
    },

    // Day 5 — Wed 19 Feb
    {
      description: 'Lunch on the slopes (Camanel di Planon)',
      amount: 186.0,
      paid_by: nameToId['Luca'],
      expense_date: '2025-02-19',
      category: 'food',
      comment: null,
    },
    {
      description: 'Fuel for drive home',
      amount: 95.0,
      paid_by: nameToId['Tom'],
      expense_date: '2025-02-19',
      category: 'transport',
      comment: 'Split between both cars',
    },
    {
      description: 'Highway tolls',
      amount: 38.6,
      paid_by: nameToId['Joonas'],
      expense_date: '2025-02-19',
      category: 'transport',
      comment: 'Livigno → Milan',
    },
    {
      description: 'Accommodation (Chalet Monte Sponda)',
      amount: 1800.0,
      paid_by: nameToId['Luca'],
      expense_date: '2025-02-19',
      category: 'accommodation',
      comment: '5 nights, settled at checkout',
    },
  ]

  const expenseRows = expenses.map(({ _split, ...e }) => ({
    trip_id: tripId,
    description: e.description,
    amount: e.amount,
    paid_by: e.paid_by,
    expense_date: e.expense_date,
    category: e.category,
    currency: 'EUR',
    comment: e.comment,
    distribution: dist(_split),
  }))

  const { error: expErr } = await supabase.from('expenses').insert(expenseRows)

  if (expErr) {
    console.error('Error creating expenses:', expErr)
    process.exit(1)
  }

  console.log(`  ${expenses.length} expenses created`)

  // 5. Summary
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  console.log('\nDone!')
  console.log(`  Trip: Livigno Ski Trip 2025`)
  console.log(`  Participants: ${participants.length}`)
  console.log(`  Expenses: ${expenses.length}`)
  console.log(`  Total: EUR ${total.toFixed(2)}`)
  console.log(`  URL: /t/${TRIP_CODE}`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
