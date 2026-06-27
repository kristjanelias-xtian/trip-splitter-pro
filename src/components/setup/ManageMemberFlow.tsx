// SPDX-License-Identifier: Apache-2.0
/**
 * ManageMemberFlow — wizard to replace, remove, or add a trip participant,
 * reassigning their shares / paid expenses / settlements with a before/after
 * balance preview.
 *
 * All participant / expense / settlement data is sourced from
 * useReassignParticipant().previewSnapshot() so the component is testable with
 * a single hook mock. Currency / rates / tracking mode come from useCurrentTrip.
 */

import { useMemo, useRef, useState } from 'react'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useReassignParticipant } from '@/hooks/useReassignParticipant'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { calculateBalances, formatBalance } from '@/services/balanceCalculator'
import {
  applyPlan,
  buildFootprint,
  type ReassignmentPlan,
  type Backfill,
  type SharesChoice,
  type SettlementsChoice,
  type PaidChoice,
} from '@/services/participantReassignment'

export interface ManageMemberFlowProps {
  open: boolean
  onClose: () => void
  mode: 'replace' | 'remove' | 'add'
  sourceParticipantId?: string // required for replace/remove
}

type TargetKind = 'new' | 'existing'
type Handover = 'full' | 'reallocate'
type Step = 'choose' | 'preview'

export function ManageMemberFlow({ open, onClose, mode, sourceParticipantId }: ManageMemberFlowProps) {
  const { reassign, previewSnapshot } = useReassignParticipant()
  const { currentTrip } = useCurrentTrip()
  const snap = previewSnapshot()

  const currency = currentTrip?.default_currency ?? 'EUR'
  const rates = currentTrip?.exchange_rates ?? {}
  const trackingMode = (currentTrip?.tracking_mode ?? 'individuals') as 'individuals' | 'families'

  // New-participant id generated once (UI layer — core stays deterministic).
  const newIdRef = useRef<string>(crypto.randomUUID())
  const newId = newIdRef.current

  const [step, setStep] = useState<Step>('choose')
  // effectiveMode lets a replace-entry switch to the remove UI in-flow without
  // changing the mode prop (so callers stay simple and the E2E suite can reach
  // remove from the per-row "Manage" entry point).
  const [effectiveMode, setEffectiveMode] = useState(mode)
  const [targetKind, setTargetKind] = useState<TargetKind>('new')
  const [newName, setNewName] = useState('')
  const [existingTargetId, setExistingTargetId] = useState('')
  const [handover, setHandover] = useState<Handover>('full')

  // Per-bucket destinations (reallocate mode). Default to the primary target.
  // Remove mode never introduces a new participant, so the new-id fallback only
  // applies when replacing - otherwise buckets must route to an existing target.
  const primaryTarget = effectiveMode === 'replace' && targetKind === 'new' ? newId : existingTargetId
  const [sharesTargetId, setSharesTargetId] = useState('')
  const [settlementsChoice, setSettlementsChoice] = useState('')
  const [paidTargetId, setPaidTargetId] = useState('')

  // add-mode backfill selection
  const [backfillSel, setBackfillSel] = useState<Record<string, { checked: boolean; mode: 'equal' | 'amount'; amount: string }>>({})

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Candidate targets for "existing" pickers — everyone except the source.
  const candidates = useMemo(
    () => snap.participants.filter(p => p.id !== sourceParticipantId),
    [snap.participants, sourceParticipantId]
  )

  const sharesDest: SharesChoice = { kind: 'transfer', targetId: sharesTargetId || primaryTarget }
  const settlementsDest: SettlementsChoice =
    settlementsChoice === 'delete'
      ? { kind: 'delete' }
      : { kind: 'transfer', targetId: settlementsChoice || primaryTarget }
  const paidDest: PaidChoice = { kind: 'transfer', targetId: paidTargetId || primaryTarget }

  const backfill: Backfill[] = useMemo(() => {
    return snap.expenses
      .filter(e => backfillSel[e.id]?.checked)
      .map(e => {
        const sel = backfillSel[e.id]
        return sel.mode === 'amount'
          ? { expenseId: e.id, mode: 'amount' as const, amount: Number(sel.amount) || 0 }
          : { expenseId: e.id, mode: 'equal' as const }
      })
  }, [snap.expenses, backfillSel])

  function buildPlan(): ReassignmentPlan {
    if (effectiveMode === 'add') {
      return {
        op: 'add',
        newParticipant: { id: newId, trip_id: currentTrip!.id, name: newName.trim(), is_adult: true },
        backfill,
      }
    }
    // Remove never introduces a replacement participant - only replace does.
    const newParticipant =
      effectiveMode === 'replace' && targetKind === 'new'
        ? { id: newId, trip_id: currentTrip!.id, name: newName.trim(), is_adult: true }
        : undefined
    if (handover === 'full') {
      return {
        op: effectiveMode,
        sourceId: sourceParticipantId!,
        remove: true,
        newParticipant,
        shares: { kind: 'transfer', targetId: primaryTarget },
        settlements: { kind: 'transfer', targetId: primaryTarget },
        paid: { kind: 'transfer', targetId: primaryTarget },
      }
    }
    return {
      op: effectiveMode,
      sourceId: sourceParticipantId!,
      remove: true,
      newParticipant,
      shares: sharesDest,
      settlements: settlementsDest,
      paid: paidDest,
    }
  }

  // remove mode: block Confirm while the source has settlements / paid expenses
  // whose destinations are unresolved.
  const footprint = useMemo(
    () => (sourceParticipantId ? buildFootprint(snap, sourceParticipantId) : null),
    [snap, sourceParticipantId]
  )
  const hasSettlements = !!footprint && (footprint.settlementsFrom.length > 0 || footprint.settlementsTo.length > 0)
  const hasPaid = !!footprint && footprint.paidExpenses.length > 0
  const removeUnresolved =
    effectiveMode === 'remove' &&
    ((hasSettlements && !settlementsChoice) || (hasPaid && !paidTargetId))

  const confirmDisabled =
    submitting ||
    (effectiveMode !== 'add' && handover === 'reallocate' && targetKind === 'existing' && !existingTargetId) ||
    (effectiveMode !== 'add' && effectiveMode !== 'remove' && targetKind === 'new' && !newName.trim()) ||
    (effectiveMode === 'add' && !newName.trim()) ||
    removeUnresolved

  // Preview balances (before vs after applying the plan). Only needed on the
  // preview step, so computed inline (cheap) rather than memoised — this avoids
  // a stale closure over buildPlan / snap / currency / rates / trackingMode.
  function computePreview(): { id: string; name: string; before: number; after: number; delta: number }[] {
    if (step !== 'preview' || !currentTrip) return []
    let plan: ReassignmentPlan
    try {
      plan = buildPlan()
    } catch {
      return []
    }
    const before = calculateBalances(snap.expenses, snap.participants, trackingMode, snap.settlements, currency, rates)
    const afterSnap = applyPlan(snap, plan)
    const after = calculateBalances(afterSnap.expenses, afterSnap.participants, trackingMode, afterSnap.settlements, currency, rates)
    const afterById = new Map(after.balances.map(b => [b.id, b]))
    const beforeById = new Map(before.balances.map(b => [b.id, b]))
    const ids = new Set<string>([...beforeById.keys(), ...afterById.keys()])
    const rows: { id: string; name: string; before: number; after: number; delta: number }[] = []
    for (const id of ids) {
      const b = beforeById.get(id)?.balance ?? 0
      const a = afterById.get(id)?.balance ?? 0
      const name = afterById.get(id)?.name ?? beforeById.get(id)?.name ?? id
      if (Math.abs(a - b) > 0.005) rows.push({ id, name, before: b, after: a, delta: a - b })
    }
    return rows
  }
  const preview = computePreview()

  const handleConfirm = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await reassign(buildPlan())
      if (res.ok) {
        onClose()
      } else {
        setError(res.error ?? 'Failed to update participant')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    effectiveMode === 'add' ? 'Add a person' : effectiveMode === 'remove' ? 'Remove person' : 'Manage person'

  const footer =
    step === 'choose' ? (
      <Button className="w-full" onClick={() => setStep('preview')} disabled={confirmDisabled}>
        Preview
      </Button>
    ) : (
      <Button className="w-full" onClick={handleConfirm} disabled={confirmDisabled}>
        {submitting ? 'Saving...' : 'Confirm'}
      </Button>
    )

  return (
    <ResponsiveOverlay
      open={open}
      onClose={onClose}
      title={title}
      hasInputs
      footer={footer}
      onBack={step === 'preview' ? () => setStep('choose') : undefined}
    >
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {step === 'choose' && (
        <div className="space-y-5">
          {/* Target picker (replace mode only) */}
          {effectiveMode === 'replace' && (
            <div className="space-y-3">
              <Label>Who takes over?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={targetKind === 'new' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTargetKind('new')}
                >
                  Add a new person
                </Button>
                <Button
                  type="button"
                  variant={targetKind === 'existing' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTargetKind('existing')}
                >
                  An existing person
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setEffectiveMode('remove')}
              >
                Remove from trip
              </Button>

              {targetKind === 'new' && (
                <div className="space-y-2">
                  <Label htmlFor="mm-new-name">New person name</Label>
                  <Input
                    id="mm-new-name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
              )}

              {targetKind === 'existing' && (
                <div className="space-y-2">
                  <Label htmlFor="mm-existing-target">Existing person</Label>
                  <select
                    id="mm-existing-target"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={existingTargetId}
                    onChange={e => setExistingTargetId(e.target.value)}
                  >
                    <option value="">Select a person</option>
                    {candidates.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Handover mode (replace/remove) */}
          {effectiveMode !== 'add' && (
            <div className="space-y-3">
              <Label>How should their items move?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={handover === 'full' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setHandover('full')}
                >
                  Full handover
                </Button>
                <Button
                  type="button"
                  variant={handover === 'reallocate' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setHandover('reallocate')}
                >
                  Drop out &amp; reallocate
                </Button>
              </div>

              {handover === 'reallocate' && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div className="space-y-2">
                    <Label htmlFor="mm-shares-dest">Shares destination</Label>
                    <select
                      id="mm-shares-dest"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={sharesTargetId}
                      onChange={e => setSharesTargetId(e.target.value)}
                    >
                      <option value="">{targetKind === 'new' ? 'New person' : 'Primary target'}</option>
                      {candidates.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mm-paid-dest">Paid expenses destination</Label>
                    <select
                      id="mm-paid-dest"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={paidTargetId}
                      onChange={e => setPaidTargetId(e.target.value)}
                    >
                      <option value="">{targetKind === 'new' ? 'New person' : 'Primary target'}</option>
                      {candidates.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mm-settlements-dest">Settlements destination</Label>
                    <select
                      id="mm-settlements-dest"
                      aria-label="Settlements destination"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={settlementsChoice}
                      onChange={e => setSettlementsChoice(e.target.value)}
                    >
                      <option value="">{targetKind === 'new' ? 'New person' : 'Primary target'}</option>
                      {candidates.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      <option value="delete">Delete settlements</option>
                    </select>
                  </div>
                </div>
              )}

              {effectiveMode === 'remove' && removeUnresolved && (
                <p className="text-sm text-muted-foreground">
                  Reassign this person&apos;s settlements and paid expenses before removing them.
                </p>
              )}
            </div>
          )}

          {/* add mode: name + backfill checklist */}
          {effectiveMode === 'add' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mm-add-name">New person name</Label>
                <Input
                  id="mm-add-name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Name"
                />
              </div>

              {snap.expenses.length > 0 && (
                <div className="space-y-2">
                  <Label>Include in existing expenses</Label>
                  <div className="space-y-2">
                    {snap.expenses.map(e => {
                      const sel = backfillSel[e.id] ?? { checked: false, mode: 'equal' as const, amount: '' }
                      return (
                        <div key={e.id} className="rounded-lg border border-border p-2 space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={sel.checked}
                              onCheckedChange={checked =>
                                setBackfillSel(prev => ({ ...prev, [e.id]: { ...sel, checked: checked as boolean } }))
                              }
                            />
                            <span className="truncate">{e.description}</span>
                            <span className="ml-auto text-muted-foreground">{formatBalance(e.amount, e.currency)}</span>
                          </label>
                          {sel.checked && (
                            <div className="flex items-center gap-2 pl-6">
                              <Button
                                type="button"
                                size="sm"
                                variant={sel.mode === 'equal' ? 'default' : 'outline'}
                                onClick={() => setBackfillSel(prev => ({ ...prev, [e.id]: { ...sel, mode: 'equal' } }))}
                              >
                                Equal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={sel.mode === 'amount' ? 'default' : 'outline'}
                                onClick={() => setBackfillSel(prev => ({ ...prev, [e.id]: { ...sel, mode: 'amount' } }))}
                              >
                                Amount
                              </Button>
                              {sel.mode === 'amount' && (
                                <Input
                                  inputMode="decimal"
                                  className="h-8 w-24"
                                  value={sel.amount}
                                  onChange={ev =>
                                    setBackfillSel(prev => ({ ...prev, [e.id]: { ...sel, amount: ev.target.value.replace(',', '.') } }))
                                  }
                                  placeholder="0"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Balance changes after this update:</p>
          {preview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No balance changes.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                <span>Person</span>
                <span className="text-right">Before</span>
                <span className="text-right">After</span>
                <span className="text-right">Change</span>
              </div>
              {preview.map(row => (
                <div key={row.id} className="grid grid-cols-4 gap-2 text-sm">
                  <span className="truncate">{row.name}</span>
                  <span className="text-right">{formatBalance(row.before, currency)}</span>
                  <span className="text-right">{formatBalance(row.after, currency)}</span>
                  <span className={`text-right ${row.delta >= 0 ? 'text-positive' : 'text-destructive'}`}>
                    {formatBalance(row.delta, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ResponsiveOverlay>
  )
}
