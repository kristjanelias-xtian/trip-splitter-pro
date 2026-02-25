/**
 * Phase 3 Step 4b: Verify balances after JSONB migration.
 *
 * Fetches all trips, participants, families, expenses, settlements from Supabase.
 * Runs calculateBalancesV2 for each trip.
 * Compares output to balance_snapshot_pre.json by entity name.
 * Reports any discrepancy.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Import the V2 calculator — using relative path from project root
// We can't use @ aliases in tsx scripts, so we'll inline the logic
// Actually, let's just use dynamic import with ts paths

async function main() {
  // Load pre-migration snapshot
  const snapshot = JSON.parse(fs.readFileSync('balance_snapshot_pre.json', 'utf-8'))
  const snapshotTrips = snapshot.trips as Array<{
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
  }>

  console.log(`📊 Pre-migration snapshot: ${snapshotTrips.length} trips`)

  // Fetch all data from Supabase
  const { data: trips } = await supabase.from('trips').select('*')
  const { data: participants } = await supabase.from('participants').select('*')
  const { data: families } = await supabase.from('families').select('*')
  const { data: expenses } = await supabase.from('expenses').select('*')
  const { data: settlements } = await supabase.from('settlements').select('*')

  if (!trips || !participants || !families || !expenses || !settlements) {
    console.error('Failed to fetch data from Supabase')
    process.exit(1)
  }

  // We need to replicate calculateBalancesV2 logic here since we can't easily import it.
  // But actually we can use tsx with tsconfig paths...
  // Let me try a different approach: use the buildEntityMapV2 + calculateBalancesV2 logic inline.

  // Inline implementation of buildEntityMapV2 and calculateBalancesV2
  function buildEntityMapV2(tripParticipants: any[], trackingMode: string) {
    const entities: Array<{ id: string; name: string; isFamily: boolean }> = []
    const participantToEntityId = new Map<string, string>()
    const familyToEntityId = new Map<string, string>()

    if (trackingMode === 'individuals') {
      for (const p of tripParticipants) {
        entities.push({ id: p.id, name: p.name, isFamily: false })
        participantToEntityId.set(p.id, p.id)
      }
    } else {
      const walletGroups = new Map<string, any[]>()
      for (const p of tripParticipants) {
        if (p.wallet_group) {
          const group = walletGroups.get(p.wallet_group) || []
          group.push(p)
          walletGroups.set(p.wallet_group, group)
        } else {
          entities.push({ id: p.id, name: p.name, isFamily: false })
          participantToEntityId.set(p.id, p.id)
        }
      }

      for (const [groupName, members] of walletGroups) {
        const sortedAdults = members.filter((m: any) => m.is_adult).sort((a: any, b: any) => a.name.localeCompare(b.name))
        const sortedAll = [...members].sort((a: any, b: any) => a.name.localeCompare(b.name))
        const canonical = sortedAdults[0] ?? sortedAll[0]

        entities.push({ id: canonical.id, name: groupName, isFamily: true })

        for (const member of members) {
          participantToEntityId.set(member.id, canonical.id)
          if (member.family_id && !familyToEntityId.has(member.family_id)) {
            familyToEntityId.set(member.family_id, canonical.id)
          }
        }
      }
    }

    return { entities, participantToEntityId, familyToEntityId }
  }

  function convertToBaseCurrency(amount: number, fromCurrency: string, baseCurrency: string, exchangeRates: Record<string, number>): number {
    if (fromCurrency === baseCurrency) return amount
    const rate = exchangeRates[fromCurrency]
    if (!rate || rate === 0) return amount
    return amount / rate
  }

  function calculateExpenseSharesV2(expense: any, tripParticipants: any[], tripFamilies: any[], trackingMode: string, entityMap: any) {
    const { participantToEntityId, familyToEntityId } = entityMap
    const shares = new Map<string, number>()
    const distribution = expense.distribution
    const splitMode = distribution.splitMode || 'equal'

    if (distribution.type === 'individuals') {
      if (splitMode === 'equal') {
        const shareAmount = expense.amount / distribution.participants.length
        for (const pid of distribution.participants) {
          const eid = participantToEntityId.get(pid) ?? pid
          shares.set(eid, (shares.get(eid) || 0) + shareAmount)
        }
      } else if (splitMode === 'percentage' && distribution.participantSplits) {
        for (const split of distribution.participantSplits) {
          const shareAmount = (expense.amount * split.value) / 100
          const eid = participantToEntityId.get(split.participantId) ?? split.participantId
          shares.set(eid, (shares.get(eid) || 0) + shareAmount)
        }
      } else if (splitMode === 'amount' && distribution.participantSplits) {
        for (const split of distribution.participantSplits) {
          const eid = participantToEntityId.get(split.participantId) ?? split.participantId
          shares.set(eid, (shares.get(eid) || 0) + split.value)
        }
      }
    } else if (distribution.type === 'families') {
      if (splitMode === 'equal') {
        const shouldAccountForSize = distribution.accountForFamilySize ?? false
        if (shouldAccountForSize) {
          let totalPeople = 0
          for (const fid of distribution.families) {
            const family = tripFamilies.find((f: any) => f.id === fid)
            if (family) totalPeople += family.adults + family.children
          }
          const perPersonShare = expense.amount / totalPeople
          for (const fid of distribution.families) {
            const family = tripFamilies.find((f: any) => f.id === fid)
            if (family) {
              const eid = familyToEntityId.get(fid) ?? fid
              shares.set(eid, (shares.get(eid) || 0) + perPersonShare * (family.adults + family.children))
            }
          }
        } else {
          const shareAmount = expense.amount / distribution.families.length
          for (const fid of distribution.families) {
            const eid = familyToEntityId.get(fid) ?? fid
            shares.set(eid, (shares.get(eid) || 0) + shareAmount)
          }
        }
      } else if (splitMode === 'percentage' && distribution.familySplits) {
        for (const split of distribution.familySplits) {
          const shareAmount = (expense.amount * split.value) / 100
          const eid = familyToEntityId.get(split.familyId) ?? split.familyId
          shares.set(eid, (shares.get(eid) || 0) + shareAmount)
        }
      } else if (splitMode === 'amount' && distribution.familySplits) {
        for (const split of distribution.familySplits) {
          const eid = familyToEntityId.get(split.familyId) ?? split.familyId
          shares.set(eid, (shares.get(eid) || 0) + split.value)
        }
      }
    } else if (distribution.type === 'mixed') {
      const standaloneParticipants = distribution.participants.filter((pid: string) => {
        const p = tripParticipants.find((pp: any) => pp.id === pid)
        if (!p) return false
        if (!p.family_id) return true
        return !distribution.families.includes(p.family_id)
      })

      if (splitMode === 'equal') {
        let totalPeople = standaloneParticipants.length
        for (const fid of distribution.families) {
          const family = tripFamilies.find((f: any) => f.id === fid)
          if (family) totalPeople += family.adults + family.children
        }
        const perPersonShare = expense.amount / totalPeople
        for (const fid of distribution.families) {
          const family = tripFamilies.find((f: any) => f.id === fid)
          if (family) {
            const eid = familyToEntityId.get(fid) ?? fid
            shares.set(eid, (shares.get(eid) || 0) + perPersonShare * (family.adults + family.children))
          }
        }
        for (const pid of standaloneParticipants) {
          const eid = participantToEntityId.get(pid) ?? pid
          shares.set(eid, (shares.get(eid) || 0) + perPersonShare)
        }
      }
    }

    return shares
  }

  // Compare each trip
  let totalDiscrepancies = 0

  for (const snapTrip of snapshotTrips) {
    const trip = trips.find((t: any) => t.id === snapTrip.trip_id)
    if (!trip) {
      console.error(`❌ Trip ${snapTrip.trip_name} (${snapTrip.trip_id}) not found in database`)
      totalDiscrepancies++
      continue
    }

    const tripParticipants = participants.filter((p: any) => p.trip_id === trip.id)
    const tripFamilies = families.filter((f: any) => f.trip_id === trip.id)
    const tripExpenses = expenses.filter((e: any) => e.trip_id === trip.id)
    const tripSettlements = settlements.filter((s: any) => s.trip_id === trip.id)

    const trackingMode = trip.tracking_mode
    const defaultCurrency = trip.default_currency || 'EUR'
    const exchangeRates = trip.exchange_rates || {}

    const entityMap = buildEntityMapV2(tripParticipants, trackingMode)
    const { entities, participantToEntityId } = entityMap

    // Initialize balances
    const balances = new Map<string, any>()
    for (const entity of entities) {
      balances.set(entity.id, {
        id: entity.id,
        name: entity.name,
        totalPaid: 0,
        totalShare: 0,
        balance: 0,
        isFamily: entity.isFamily,
      })
    }

    // Total expenses
    let totalExpenses = 0
    for (const expense of tripExpenses) {
      const convertedAmount = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
      totalExpenses += convertedAmount

      // Credit payer
      const payerEntityId = participantToEntityId.get(expense.paid_by)
      if (payerEntityId && balances.has(payerEntityId)) {
        balances.get(payerEntityId)!.totalPaid += convertedAmount
      }

      // Calculate shares
      const shares = calculateExpenseSharesV2(expense, tripParticipants, tripFamilies, trackingMode, entityMap)
      const conversionFactor = expense.amount !== 0 ? convertedAmount / expense.amount : 1
      shares.forEach((share: number, entityId: string) => {
        if (balances.has(entityId)) {
          balances.get(entityId)!.totalShare += share * conversionFactor
        }
      })
    }

    // Calculate final balances
    balances.forEach(b => { b.balance = b.totalPaid - b.totalShare })

    // Apply settlements
    for (const settlement of tripSettlements) {
      const fromEntityId = participantToEntityId.get(settlement.from_participant_id)
      const toEntityId = participantToEntityId.get(settlement.to_participant_id)
      const convertedAmount = convertToBaseCurrency(settlement.amount, settlement.currency, defaultCurrency, exchangeRates)

      if (fromEntityId && balances.has(fromEntityId)) {
        balances.get(fromEntityId)!.balance += convertedAmount
      }
      if (toEntityId && balances.has(toEntityId)) {
        balances.get(toEntityId)!.balance -= convertedAmount
      }
    }

    // Compare by entity name
    const currentBalances = Array.from(balances.values())
    let tripDiscrepancies = 0

    for (const snapBalance of snapTrip.balances) {
      const current = currentBalances.find(b => b.name === snapBalance.name)
      if (!current) {
        console.error(`  ❌ ${snapTrip.trip_name}: entity "${snapBalance.name}" not found in current calculation`)
        tripDiscrepancies++
        continue
      }

      const fields: Array<{ field: string; old: number; new: number }> = []
      if (Math.abs(current.totalPaid - snapBalance.totalPaid) > 0.01) {
        fields.push({ field: 'totalPaid', old: snapBalance.totalPaid, new: current.totalPaid })
      }
      if (Math.abs(current.totalShare - snapBalance.totalShare) > 0.01) {
        fields.push({ field: 'totalShare', old: snapBalance.totalShare, new: current.totalShare })
      }
      if (Math.abs(current.balance - snapBalance.balance) > 0.01) {
        fields.push({ field: 'balance', old: snapBalance.balance, new: current.balance })
      }

      if (fields.length > 0) {
        console.error(`  ❌ ${snapTrip.trip_name} / "${snapBalance.name}":`)
        for (const f of fields) {
          console.error(`    ${f.field}: ${f.old} → ${f.new} (diff: ${(f.new - f.old).toFixed(4)})`)
        }
        tripDiscrepancies++
      }
    }

    if (tripDiscrepancies === 0) {
      console.log(`  ✅ ${snapTrip.trip_name}: all balances match`)
    } else {
      totalDiscrepancies += tripDiscrepancies
    }
  }

  console.log(`\n${totalDiscrepancies === 0 ? '✅ ZERO DISCREPANCIES' : `❌ ${totalDiscrepancies} DISCREPANCIES FOUND`}`)

  if (totalDiscrepancies > 0) {
    console.error('\n🚨 DO NOT PROCEED — discrepancies found!')
    process.exit(1)
  }
}

main()
