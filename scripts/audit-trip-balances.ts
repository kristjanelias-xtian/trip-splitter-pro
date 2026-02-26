/**
 * Balance audit script for a specific production trip.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/audit-trip-balances.ts <trip_code>
 *
 * Runs 8 checks against the balance calculator and prints a full report.
 */

import { createClient } from '@supabase/supabase-js'
import {
  calculateBalances,
  buildEntityMap,
  calculateExpenseShares,
  convertToBaseCurrency,
} from '../src/services/balanceCalculator'
import type { Expense } from '../src/types/expense'
import type { Participant } from '../src/types/participant'
import type { Settlement } from '../src/types/settlement'

// ─── Setup ──────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const tripCode = process.argv[2]
if (!tripCode) {
  console.error('ERROR: Provide trip_code as CLI argument.')
  console.error('Usage: npx tsx scripts/audit-trip-balances.ts <trip_code>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Helpers ────────────────────────────────────────────

const PASS = '  PASS'
const FAIL = '  FAIL'
const WARN = '  WARN'
const INFO = '  INFO'

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals)
}

function fmtEur(n: number): string {
  return `€${fmt(n)}`
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length)
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : ' '.repeat(len - s.length) + s
}

function printTable(headers: string[], rows: string[][], colWidths?: number[]) {
  const widths = colWidths ?? headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? '').length))
  )
  const sep = widths.map(w => '-'.repeat(w + 2)).join('+')
  const fmtRow = (row: string[]) =>
    row.map((cell, i) => {
      // Right-align numeric-looking cells
      const trimmed = cell.trim()
      const isNumeric = /^[-+€]?\d/.test(trimmed) || trimmed === '0.00'
      return isNumeric ? padLeft(cell, widths[i]) : padRight(cell, widths[i])
    }).join(' | ')

  console.log('  ' + fmtRow(headers))
  console.log('  ' + sep)
  for (const row of rows) {
    console.log('  ' + fmtRow(row))
  }
}

let failCount = 0
let warnCount = 0

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70))
  console.log('  BALANCE AUDIT REPORT')
  console.log('  ' + new Date().toISOString())
  console.log('='.repeat(70))
  console.log()

  // ── Fetch trip ──
  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('id, name, trip_code, tracking_mode, default_currency, exchange_rates, created_by')
    .eq('trip_code', tripCode)
    .single()

  if (tripErr || !trip) {
    console.error(`ERROR: Trip with code "${tripCode}" not found.`)
    if (tripErr) console.error(tripErr.message)
    process.exit(1)
  }

  // ── Fetch related data ──
  const [participantsRes, expensesRes, settlementsRes] = await Promise.all([
    supabase.from('participants').select('*').eq('trip_id', trip.id),
    supabase.from('expenses').select('*').eq('trip_id', trip.id),
    supabase.from('settlements').select('*').eq('trip_id', trip.id),
  ])

  if (participantsRes.error || expensesRes.error || settlementsRes.error) {
    console.error('ERROR: Failed to fetch trip data.')
    if (participantsRes.error) console.error('  participants:', participantsRes.error.message)
    if (expensesRes.error) console.error('  expenses:', expensesRes.error.message)
    if (settlementsRes.error) console.error('  settlements:', settlementsRes.error.message)
    process.exit(1)
  }

  const participants = participantsRes.data as Participant[]
  const expenses = expensesRes.data as Expense[]
  const settlements = settlementsRes.data as Settlement[]

  const defaultCurrency = (trip.default_currency || 'EUR') as string
  const exchangeRates = (trip.exchange_rates || {}) as Record<string, number>
  const trackingMode = (trip.tracking_mode || 'individuals') as 'individuals' | 'families'

  // ────────────────────────────────────────────────────────
  // CHECK 1 — Trip loads correctly
  // ────────────────────────────────────────────────────────
  console.log('CHECK 1 — Trip loads correctly')
  console.log('-'.repeat(50))
  console.log(`${INFO} Trip name:         ${trip.name}`)
  console.log(`${INFO} Trip code:         ${trip.trip_code}`)
  console.log(`${INFO} Default currency:  ${defaultCurrency}`)
  console.log(`${INFO} Tracking mode:     ${trackingMode}`)
  console.log(`${INFO} Exchange rates:`)
  const rateEntries = Object.entries(exchangeRates)
  if (rateEntries.length === 0) {
    console.log(`       (none)`)
  } else {
    for (const [currency, rate] of rateEntries) {
      console.log(`       1 ${defaultCurrency} = ${rate} ${currency}`)
    }
  }
  console.log(`${INFO} Participants:      ${participants.length}`)
  console.log(`${INFO} Expenses:          ${expenses.length}`)
  console.log(`${INFO} Settlements:       ${settlements.length}`)

  // Check: if any THB expenses exist, verify rate
  const currenciesUsed = new Set(expenses.map(e => e.currency))
  const hasTHB = currenciesUsed.has('THB')
  if (hasTHB && !exchangeRates['THB']) {
    console.log(`${FAIL} THB expenses found but no THB exchange rate set!`)
    failCount++
  } else if (hasTHB) {
    console.log(`${PASS} THB exchange rate is set (${exchangeRates['THB']})`)
  }
  if (rateEntries.length > 0 || !hasTHB) {
    console.log(`${PASS} Trip loaded successfully`)
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 2 — No orphaned participant references
  // ────────────────────────────────────────────────────────
  console.log('CHECK 2 — No orphaned participant references')
  console.log('-'.repeat(50))

  const participantIds = new Set(participants.map(p => p.id))
  let orphanCount = 0

  for (const expense of expenses) {
    // Check paid_by
    if (!participantIds.has(expense.paid_by)) {
      console.log(`${FAIL} Expense "${expense.description}" (${fmtEur(expense.amount)}): paid_by ${expense.paid_by} not in participants`)
      orphanCount++
    }

    // Check distribution participants
    if (expense.distribution.type === 'individuals') {
      for (const pid of expense.distribution.participants) {
        if (!participantIds.has(pid)) {
          console.log(`${FAIL} Expense "${expense.description}" (${fmtEur(expense.amount)}): distribution references ${pid} not in participants`)
          orphanCount++
        }
      }

      // Check participantSplits if present
      if (expense.distribution.participantSplits) {
        for (const split of expense.distribution.participantSplits) {
          if (!participantIds.has(split.participantId)) {
            console.log(`${FAIL} Expense "${expense.description}" (${fmtEur(expense.amount)}): participantSplit references ${split.participantId} not in participants`)
            orphanCount++
          }
        }
      }
    }
  }

  if (orphanCount === 0) {
    console.log(`${PASS} All ${expenses.length} expenses reference valid participant IDs`)
  } else {
    console.log(`${FAIL} Found ${orphanCount} orphaned references`)
    failCount++
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 3 — Every expense is fully allocated
  // ────────────────────────────────────────────────────────
  console.log('CHECK 3 — Every expense is fully allocated')
  console.log('-'.repeat(50))

  const entityMap = buildEntityMap(participants, trackingMode)
  let totalAmountBase = 0
  let withinTolerance = 0
  let outsideTolerance = 0
  const failingExpenses: Array<{ desc: string; amount: string; sumShares: string; discrepancy: string; dist: string }> = []

  for (const expense of expenses) {
    const convertedAmount = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
    totalAmountBase += convertedAmount

    const shares = calculateExpenseShares(expense, participants, trackingMode, entityMap)
    const conversionFactor = expense.amount !== 0 ? convertedAmount / expense.amount : 1

    let sumShares = 0
    shares.forEach((share) => {
      sumShares += share * conversionFactor
    })

    const discrepancy = Math.abs(convertedAmount - sumShares)
    if (discrepancy <= 0.02) {
      withinTolerance++
    } else {
      outsideTolerance++
      failingExpenses.push({
        desc: expense.description.substring(0, 40),
        amount: fmtEur(convertedAmount),
        sumShares: fmtEur(sumShares),
        discrepancy: fmtEur(discrepancy),
        dist: JSON.stringify(expense.distribution).substring(0, 80) + '...',
      })
    }
  }

  console.log(`${INFO} Total expenses:              ${expenses.length}`)
  console.log(`${INFO} Total amount (base):         ${fmtEur(totalAmountBase)}`)
  console.log(`${INFO} Expenses within tolerance:   ${withinTolerance}`)
  console.log(`${INFO} Expenses with discrepancy:   ${outsideTolerance}`)

  if (outsideTolerance > 0) {
    console.log()
    console.log(`${FAIL} Failing expenses:`)
    printTable(
      ['Description', 'Amount', 'Sum Shares', 'Discrepancy'],
      failingExpenses.map(f => [f.desc, f.amount, f.sumShares, f.discrepancy])
    )
    for (const f of failingExpenses) {
      console.log(`       Distribution: ${f.dist}`)
    }
    failCount++
  } else {
    console.log(`${PASS} All expenses fully allocated (tolerance ±€0.02)`)
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 4 — Payer credits are correct
  // ────────────────────────────────────────────────────────
  console.log('CHECK 4 — Payer credits are correct')
  console.log('-'.repeat(50))

  // Raw paid totals from expense data (base currency)
  const rawPaidByParticipant = new Map<string, number>()
  for (const p of participants) {
    rawPaidByParticipant.set(p.id, 0)
  }
  for (const expense of expenses) {
    const convertedAmount = convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
    const prev = rawPaidByParticipant.get(expense.paid_by) ?? 0
    rawPaidByParticipant.set(expense.paid_by, prev + convertedAmount)
  }

  // Calculator totals (pre-settlement — no settlements passed)
  const preSettlementResult = calculateBalances(
    expenses, participants, trackingMode, [], defaultCurrency, exchangeRates
  )

  // Map entity ID back to entity name
  const { participantToEntityId } = entityMap
  const entityBalances = new Map<string, { totalPaid: number; name: string }>()
  for (const b of preSettlementResult.balances) {
    entityBalances.set(b.id, { totalPaid: b.totalPaid, name: b.name })
  }

  // Aggregate raw paid by entity
  const rawPaidByEntity = new Map<string, number>()
  for (const [pid, amount] of rawPaidByParticipant) {
    const eid = participantToEntityId.get(pid) ?? pid
    rawPaidByEntity.set(eid, (rawPaidByEntity.get(eid) ?? 0) + amount)
  }

  let payerMismatch = false
  const payerRows: string[][] = []

  for (const entity of entityMap.entities) {
    const rawPaid = rawPaidByEntity.get(entity.id) ?? 0
    const calcPaid = entityBalances.get(entity.id)?.totalPaid ?? 0
    const diff = Math.abs(rawPaid - calcPaid)
    const match = diff <= 0.05 ? 'YES' : 'NO'
    if (match === 'NO') payerMismatch = true

    payerRows.push([
      entity.name,
      fmtEur(rawPaid),
      fmtEur(calcPaid),
      match,
    ])
  }

  printTable(['Entity', 'Raw Paid', 'Calc Paid', 'Match'], payerRows)

  if (payerMismatch) {
    console.log(`${FAIL} Payer credit mismatch detected (tolerance ±€0.05)`)
    failCount++
  } else {
    console.log(`${PASS} All payer credits match (tolerance ±€0.05)`)
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 5 — Balances net to zero (pre-settlement)
  // ────────────────────────────────────────────────────────
  console.log('CHECK 5 — Balances net to zero (pre-settlement)')
  console.log('-'.repeat(50))

  const balanceRows: string[][] = []
  let balanceSum = 0

  for (const b of preSettlementResult.balances) {
    const status = b.balance > 0.01 ? 'owed' : b.balance < -0.01 ? 'owes' : 'settled'
    balanceRows.push([
      b.name,
      fmtEur(b.totalPaid),
      fmtEur(b.totalShare),
      fmtEur(b.balance),
      status,
    ])
    balanceSum += b.balance
  }

  printTable(['Entity', 'Paid', 'Share', 'Balance', 'Status'], balanceRows)
  console.log()
  console.log(`${INFO} Sum of all balances: ${fmtEur(balanceSum)}`)

  if (Math.abs(balanceSum) > 0.05) {
    console.log(`${FAIL} Balance sum |${fmtEur(balanceSum)}| exceeds ±€0.05`)
    failCount++
  } else {
    console.log(`${PASS} Balance sum is within ±€0.05 of zero`)
  }

  // Cross-reference against known Excel values
  const expectedBalances: Record<string, number> = {
    'Kivinugise Eliased': 3664.33,
    'Tiirikud': -150.78,
    'Kersti': -1319.11,
    'Lammuka Eliased': -2194.43,
  }

  console.log()
  console.log(`${INFO} Cross-reference with Excel export:`)
  for (const [name, expectedBalance] of Object.entries(expectedBalances)) {
    const found = preSettlementResult.balances.find(b => b.name === name)
    if (!found) {
      console.log(`${WARN} Entity "${name}" not found in calculator output`)
      warnCount++
      continue
    }
    const diff = Math.abs(found.balance - expectedBalance)
    if (diff > 1.00) {
      console.log(`${WARN} ${name}: calculator=${fmtEur(found.balance)}, Excel=${fmtEur(expectedBalance)}, diff=${fmtEur(diff)}`)
      warnCount++
    } else {
      console.log(`${PASS} ${name}: calculator=${fmtEur(found.balance)}, Excel=${fmtEur(expectedBalance)}, diff=${fmtEur(diff)}`)
    }
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 6 — Settlements are valid
  // ────────────────────────────────────────────────────────
  console.log('CHECK 6 — Settlements are valid')
  console.log('-'.repeat(50))

  let settlementIssues = 0
  const settlementRows: string[][] = []
  let totalSettled = 0

  for (const s of settlements) {
    const fromP = participants.find(p => p.id === s.from_participant_id)
    const toP = participants.find(p => p.id === s.to_participant_id)
    const fromName = fromP?.name ?? `UNKNOWN(${s.from_participant_id.substring(0, 8)})`
    const toName = toP?.name ?? `UNKNOWN(${s.to_participant_id.substring(0, 8)})`

    if (!fromP) {
      console.log(`${FAIL} Settlement from unknown participant: ${s.from_participant_id}`)
      settlementIssues++
    }
    if (!toP) {
      console.log(`${FAIL} Settlement to unknown participant: ${s.to_participant_id}`)
      settlementIssues++
    }
    if (s.amount <= 0) {
      console.log(`${FAIL} Settlement ${fromName}→${toName}: non-positive amount ${s.amount}`)
      settlementIssues++
    }

    const convertedAmount = convertToBaseCurrency(s.amount, s.currency, defaultCurrency, exchangeRates)
    totalSettled += convertedAmount

    settlementRows.push([
      `${fromName} → ${toName}`,
      `${s.currency} ${fmt(s.amount)}`,
      s.currency !== defaultCurrency ? fmtEur(convertedAmount) : '',
      s.settlement_date ?? '',
      s.note ?? '',
    ])
  }

  if (settlements.length === 0) {
    console.log(`${INFO} No settlements recorded yet.`)
  } else {
    printTable(['Transfer', 'Amount', 'EUR Equiv', 'Date', 'Note'], settlementRows)
    console.log()
    console.log(`${INFO} Total settled: ${fmtEur(totalSettled)} across ${settlements.length} transactions`)
  }

  if (settlementIssues > 0) {
    console.log(`${FAIL} ${settlementIssues} settlement issues found`)
    failCount++
  } else if (settlements.length > 0) {
    console.log(`${PASS} All settlements reference valid participants with positive amounts`)
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 7 — Post-settlement balances
  // ────────────────────────────────────────────────────────
  console.log('CHECK 7 — Post-settlement balances')
  console.log('-'.repeat(50))

  const postSettlementResult = calculateBalances(
    expenses, participants, trackingMode, settlements, defaultCurrency, exchangeRates
  )

  const postRows: string[][] = []
  let allSettled = true

  for (const b of postSettlementResult.balances) {
    const preBalance = preSettlementResult.balances.find(pb => pb.id === b.id)
    const pre = preBalance?.balance ?? 0
    const settled = b.totalSettled
    const post = b.balance

    if (Math.abs(post) > 0.05) allSettled = false

    postRows.push([
      b.name,
      fmtEur(pre),
      fmtEur(settled),
      fmtEur(post),
    ])
  }

  printTable(['Entity', 'Pre-settlement', 'Settled', 'Post-settlement'], postRows)
  console.log()

  const postSum = postSettlementResult.balances.reduce((s, b) => s + b.balance, 0)
  console.log(`${INFO} Post-settlement balance sum: ${fmtEur(postSum)}`)

  if (Math.abs(postSum) > 0.05) {
    console.log(`${FAIL} Post-settlement sum exceeds ±€0.05 — indicates a calculation error`)
    failCount++
  } else {
    console.log(`${PASS} Post-settlement balances still net to zero`)
  }

  if (!allSettled) {
    console.log()
    console.log(`${INFO} Outstanding balances remain (settlements not yet complete):`)
    for (const b of postSettlementResult.balances) {
      if (Math.abs(b.balance) > 0.05) {
        const verb = b.balance > 0 ? 'is owed' : 'owes'
        console.log(`       ${b.name} ${verb} ${fmtEur(Math.abs(b.balance))}`)
      }
    }
  } else {
    console.log(`${PASS} All entities fully settled`)
  }
  console.log()

  // ────────────────────────────────────────────────────────
  // CHECK 8 — Multi-currency consistency
  // ────────────────────────────────────────────────────────
  console.log('CHECK 8 — Multi-currency consistency')
  console.log('-'.repeat(50))

  const currencyStats = new Map<string, { total: number; count: number; convertedTotal: number }>()
  for (const expense of expenses) {
    const stats = currencyStats.get(expense.currency) ?? { total: 0, count: 0, convertedTotal: 0 }
    stats.total += expense.amount
    stats.count++
    stats.convertedTotal += convertToBaseCurrency(expense.amount, expense.currency, defaultCurrency, exchangeRates)
    currencyStats.set(expense.currency, stats)
  }

  console.log(`${INFO} Currencies used: ${[...currencyStats.keys()].join(', ')}`)
  console.log()

  for (const [currency, stats] of currencyStats) {
    console.log(`  ${currency}:`)
    console.log(`    Total:     ${currency} ${fmt(stats.total)}`)
    console.log(`    Expenses:  ${stats.count}`)

    if (currency !== defaultCurrency) {
      const rate = exchangeRates[currency]
      if (rate) {
        console.log(`    Rate:      1 ${defaultCurrency} = ${rate} ${currency} (i.e. 1 ${currency} = ${fmt(1 / rate, 6)} ${defaultCurrency})`)
        console.log(`    Converted: ${fmtEur(stats.convertedTotal)}`)

        // Reasonableness check for THB
        if (currency === 'THB') {
          const eurPerThb = 1 / rate
          if (eurPerThb < 0.010 || eurPerThb > 0.100) {
            console.log(`${WARN} THB→EUR rate seems unreasonable: ${fmt(eurPerThb, 6)} EUR/THB (expected ~0.027)`)
            warnCount++
          } else {
            console.log(`${PASS} THB→EUR rate ${fmt(eurPerThb, 6)} EUR/THB is in reasonable range (0.010–0.100)`)
          }
        }
      } else {
        console.log(`${FAIL} No exchange rate set for ${currency}!`)
        failCount++
      }
    } else {
      console.log(`    (base currency — no conversion needed)`)
    }
    console.log()
  }

  // ────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────
  console.log('='.repeat(70))
  console.log('  SUMMARY')
  console.log('='.repeat(70))
  console.log(`  Checks:   8`)
  console.log(`  Failures: ${failCount}`)
  console.log(`  Warnings: ${warnCount}`)
  console.log()

  if (failCount === 0 && warnCount === 0) {
    console.log('  RESULT: ALL CHECKS PASSED')
  } else if (failCount === 0) {
    console.log(`  RESULT: PASSED WITH ${warnCount} WARNING(S)`)
  } else {
    console.log(`  RESULT: ${failCount} CHECK(S) FAILED`)
  }
  console.log('='.repeat(70))

  process.exit(failCount > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
