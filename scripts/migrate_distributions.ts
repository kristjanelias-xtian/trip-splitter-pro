/**
 * Phase 3 Step 4: Migrate expense distribution JSONB from families/mixed → individuals.
 *
 * For each expense with distribution.type = 'families' or 'mixed':
 * 1. Expand family IDs to their member participant IDs
 * 2. Merge with any standalone participant IDs (for mixed)
 * 3. Convert split values (distribute family's value equally among its members)
 * 4. Remove accountForFamilySize from the distribution
 * 5. Set type: 'individuals'
 *
 * IRREVERSIBLE — take a snapshot before running.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface FamilySplit { familyId: string; value: number }
interface ParticipantSplit { participantId: string; value: number }

async function main() {
  // 1. Take a full snapshot of expenses before migration
  console.log('📸 Taking pre-migration snapshot of all expenses...')
  const { data: allExpenses, error: snapErr } = await supabase
    .from('expenses')
    .select('id, trip_id, description, distribution')
    .order('id')

  if (snapErr || !allExpenses) {
    console.error('Failed to snapshot expenses:', snapErr)
    process.exit(1)
  }

  fs.writeFileSync(
    'expenses_snapshot_pre_migration.json',
    JSON.stringify(allExpenses, null, 2)
  )
  console.log(`  Saved ${allExpenses.length} expenses to expenses_snapshot_pre_migration.json`)

  // 2. Find expenses that need migration
  const toMigrate = allExpenses.filter(
    (e: any) => e.distribution?.type === 'families' || e.distribution?.type === 'mixed'
  )
  console.log(`\n🔍 Found ${toMigrate.length} expenses to migrate (families/mixed → individuals)`)

  if (toMigrate.length === 0) {
    console.log('Nothing to migrate!')
    return
  }

  // 3. Fetch all participants (needed to expand family IDs)
  const { data: participants, error: pErr } = await supabase
    .from('participants')
    .select('id, family_id, name, is_adult')

  if (pErr || !participants) {
    console.error('Failed to fetch participants:', pErr)
    process.exit(1)
  }

  // Build family → participants map
  const familyMembers = new Map<string, typeof participants>()
  for (const p of participants) {
    if (p.family_id) {
      const members = familyMembers.get(p.family_id) || []
      members.push(p)
      familyMembers.set(p.family_id, members)
    }
  }

  // 4. Migrate each expense
  let successCount = 0
  let errorCount = 0

  for (const expense of toMigrate) {
    const dist = expense.distribution as any
    const distType: string = dist.type
    const splitMode: string = dist.splitMode || 'equal'

    try {
      let newParticipants: string[] = []
      let newParticipantSplits: ParticipantSplit[] | undefined

      if (distType === 'families') {
        // Expand all family IDs to participant IDs
        const familyIds: string[] = dist.families || []

        for (const fid of familyIds) {
          const members = familyMembers.get(fid) || []
          if (members.length === 0) {
            console.warn(`  ⚠️ Family ${fid} has no participants (expense ${expense.id})`)
          }
          newParticipants.push(...members.map(m => m.id))
        }

        // Convert split values
        if (splitMode !== 'equal' && dist.familySplits) {
          newParticipantSplits = []
          for (const fs of dist.familySplits as FamilySplit[]) {
            const members = familyMembers.get(fs.familyId) || []
            if (members.length === 0) continue
            const perMember = fs.value / members.length
            for (const m of members) {
              newParticipantSplits.push({ participantId: m.id, value: perMember })
            }
          }
        }
      } else if (distType === 'mixed') {
        // Expand family IDs + keep standalone participant IDs
        const familyIds: string[] = dist.families || []
        const standaloneIds: string[] = dist.participants || []

        // Expand families
        for (const fid of familyIds) {
          const members = familyMembers.get(fid) || []
          if (members.length === 0) {
            console.warn(`  ⚠️ Family ${fid} has no participants (expense ${expense.id})`)
          }
          newParticipants.push(...members.map(m => m.id))
        }

        // Add standalone participants (filter out any that are already included via families)
        const expandedIds = new Set(newParticipants)
        for (const pid of standaloneIds) {
          if (!expandedIds.has(pid)) {
            newParticipants.push(pid)
          }
        }

        // Convert split values
        if (splitMode !== 'equal') {
          newParticipantSplits = []

          // Family splits → distribute among members
          if (dist.familySplits) {
            for (const fs of dist.familySplits as FamilySplit[]) {
              const members = familyMembers.get(fs.familyId) || []
              if (members.length === 0) continue
              const perMember = fs.value / members.length
              for (const m of members) {
                newParticipantSplits.push({ participantId: m.id, value: perMember })
              }
            }
          }

          // Standalone participant splits — keep as-is
          if (dist.participantSplits) {
            for (const ps of dist.participantSplits as ParticipantSplit[]) {
              // Only include if not already added via family expansion
              if (!newParticipantSplits.some(s => s.participantId === ps.participantId)) {
                newParticipantSplits.push(ps)
              }
            }
          }
        }
      }

      // Deduplicate participant IDs (should not happen but safety check)
      newParticipants = [...new Set(newParticipants)]

      // Build new distribution
      const newDist: any = {
        type: 'individuals',
        participants: newParticipants,
        splitMode: splitMode,
      }

      if (newParticipantSplits && newParticipantSplits.length > 0) {
        newDist.participantSplits = newParticipantSplits
      }

      // Update in database
      const { error: updateErr } = await supabase
        .from('expenses')
        .update({ distribution: newDist })
        .eq('id', expense.id)

      if (updateErr) {
        console.error(`  ❌ Failed to update expense ${expense.id}: ${updateErr.message}`)
        errorCount++
      } else {
        console.log(`  ✅ ${expense.id} (${expense.description}): ${distType} → individuals (${newParticipants.length} participants)`)
        successCount++
      }
    } catch (err) {
      console.error(`  ❌ Error processing expense ${expense.id}:`, err)
      errorCount++
    }
  }

  console.log(`\n📊 Migration complete: ${successCount} succeeded, ${errorCount} failed`)

  // 5. Verify: check all distributions are now type='individuals'
  console.log('\n🔍 Verification...')
  const { data: verifyExpenses, error: vErr } = await supabase
    .from('expenses')
    .select('id, distribution')

  if (vErr || !verifyExpenses) {
    console.error('Failed to verify:', vErr)
    process.exit(1)
  }

  const remaining = verifyExpenses.filter(
    (e: any) => e.distribution?.type !== 'individuals'
  )

  if (remaining.length === 0) {
    console.log('✅ All distributions are now type=\'individuals\'')
  } else {
    console.error(`❌ ${remaining.length} expenses still have non-individuals distributions:`)
    for (const e of remaining) {
      console.error(`  ${e.id}: type=${(e.distribution as any)?.type}`)
    }
    process.exit(1)
  }
}

main()
