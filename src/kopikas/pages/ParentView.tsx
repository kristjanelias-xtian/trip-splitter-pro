// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { usePet } from '../hooks/usePet'
import { useBudget } from '../contexts/BudgetContext'
import { useKopikasAuth } from '../app/KopikasAuthProvider'
import { useKopikasBasePath } from '../hooks/useKopikasBasePath'
import { TransactionList } from '../components/TransactionList'
import { EmojiBarChart } from '../components/EmojiBarChart'
import { Pet } from '../components/Pet'
import { AllowanceForm } from '../components/AllowanceForm'
import { BudgetConfig } from '../components/BudgetConfig'
import { WithdrawalApproval } from '../components/WithdrawalApproval'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import { Loader2, Trash2, Share2, Check } from 'lucide-react'

export function ParentView() {
  const { wallet, transactions, balance, loading: walletLoading, deleteWallet } = useWallet()
  const { pet, mood } = usePet()
  const { user } = useKopikasAuth()
  const navigate = useNavigate()
  const basePath = useKopikasBasePath()
  const { budget, budgetState, pendingWithdrawal, goals } = useBudget()
  const [allowanceOpen, setAllowanceOpen] = useState(false)
  const [budgetConfigOpen, setBudgetConfigOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isMember, setIsMember] = useState<boolean | null>(null)

  // Check if current user is a wallet member
  useEffect(() => {
    if (!wallet || !user) {
      setIsMember(null)
      return
    }

    const checkMembership = async () => {
      try {
        const { data } = await withTimeout(
          (supabase.from('wallet_members' as any) as any)
            .select('id')
            .eq('wallet_id', wallet.id)
            .eq('user_id', user.id)
            .maybeSingle(),
          15000,
          'Checking membership timed out'
        ) as { data: any }
        setIsMember(!!data)
      } catch {
        setIsMember(false)
      }
    }
    checkMembership()
  }, [wallet?.id, user?.id])

  const handleJoinAsParent = async () => {
    if (!wallet || !user) return
    setJoining(true)
    try {
      await withTimeout(
        (supabase.from('wallet_members' as any) as any)
          .insert({ wallet_id: wallet.id, user_id: user.id, role: 'parent' }),
        15000,
        'Joining as parent timed out'
      )
      setIsMember(true)
    } catch (error) {
      logger.error('Failed to join as parent', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setJoining(false)
    }
  }

  const handleShare = async () => {
    if (!wallet) return
    const url = `${window.location.origin}${basePath}/${wallet.wallet_code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: wallet.name, url })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Logi sisse, et näha vanema vaadet</p>
      </div>
    )
  }

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!wallet) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Rahakotti ei leitud</p>
      </div>
    )
  }

  // Second parent join prompt
  if (isMember === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg font-medium">{wallet.name}</p>
        <p className="text-muted-foreground text-center">Kas soovid liituda vanemana?</p>
        <button onClick={handleJoinAsParent} disabled={joining}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
          {joining ? 'Liitun...' : 'Liitu vanemana'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending withdrawal approval */}
      {pendingWithdrawal && (
        <WithdrawalApproval withdrawal={pendingWithdrawal} walletName={wallet.name} />
      )}

      {/* Balance */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">{wallet.name}</p>
        <p className="text-4xl font-bold tabular-nums">€{balance.toFixed(2)}</p>
      </div>

      {/* Budget config */}
      {budget ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
          <div>
            <p className="font-medium tabular-nums">€{budget.weekly_amount.toFixed(2)} / nädal</p>
          </div>
          <button onClick={() => setBudgetConfigOpen(true)}
            className="text-sm text-primary font-medium hover:underline">
            Muuda
          </button>
        </div>
      ) : (
        <button onClick={() => setBudgetConfigOpen(true)}
          className="w-full py-3 rounded-xl border border-dashed border-border text-muted-foreground font-medium hover:bg-muted/50 transition-colors">
          Seadista eelarve
        </button>
      )}

      {/* Weekly summary */}
      {budget && budgetState && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <p className="text-sm">
            Sel nädalal: <span className="font-medium tabular-nums">€{budgetState.weekSpending.toFixed(2)}</span> kulutatud / <span className="font-medium tabular-nums">€{budgetState.effectiveBudget.toFixed(2)}</span> eelarvest
          </p>
          <p className="text-sm">
            Hoiupõrsas: <span className="font-medium tabular-nums">€{budgetState.totalSavings.toFixed(2)}</span>
          </p>
          {budgetState.debt > 0 && (
            <p className="text-sm text-destructive">
              Võlg: <span className="font-medium tabular-nums">€{budgetState.debt.toFixed(2)}</span>
            </p>
          )}
        </div>
      )}

      {/* Savings goals (read-only) */}
      {goals.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Säästueesmärgid</h2>
          <div className="space-y-2">
            {goals.filter(g => !g.completed_at).map(goal => {
              const savingsTotal = budgetState?.totalSavings ?? 0
              const progress = Math.min(1, savingsTotal / goal.target_amount)
              return (
                <div key={goal.id} className="p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{goal.emoji} {goal.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      €{Math.min(savingsTotal, goal.target_amount).toFixed(2)} / €{goal.target_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Share child link */}
      <button onClick={handleShare}
        className="w-full py-3 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors">
        {copied ? <Check size={18} /> : <Share2 size={18} />}
        {copied ? 'Kopeeritud!' : 'Jaga lapse linki'}
      </button>

      {/* Add allowance */}
      <button onClick={() => setAllowanceOpen(true)}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium">
        Lisa taskuraha
      </button>

      {/* Spending summary */}
      <div>
        <h2 className="font-semibold mb-3">Kulutused</h2>
        <EmojiBarChart transactions={transactions} />
      </div>

      {/* Pet status */}
      {pet && (
        <div className="p-4 rounded-xl border border-border bg-card flex items-center gap-4">
          <Pet mood={mood.tier} level={pet.level} size="sm" />
          <div>
            <p className="font-medium">{pet.name || 'Kopikas'}</p>
            <p className="text-sm text-muted-foreground">
              {mood.tier === 'ecstatic' ? 'Ekstaatiline' :
               mood.tier === 'happy' ? 'Rõõmus' :
               mood.tier === 'neutral' ? 'Neutraalne' : 'Mures'} · Tase {pet.level}
            </p>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div>
        <h2 className="font-semibold mb-3">Viimased tehingud</h2>
        <TransactionList transactions={transactions} limit={20} />
      </div>

      {/* Delete wallet */}
      {wallet.created_by === user.id && (
        <div className="pt-4 border-t border-border">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={16} />
                Kustuta rahakott
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kustuta rahakott?</AlertDialogTitle>
                <AlertDialogDescription>
                  See kustutab rahakoti &quot;{wallet.name}&quot; koos kõigi tehingute ja lemmikuga. Seda ei saa tagasi võtta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Tühista</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    setDeleting(true)
                    const success = await deleteWallet()
                    if (success) {
                      navigate(basePath)
                    }
                    setDeleting(false)
                  }}
                >
                  {deleting ? 'Kustutan...' : 'Kustuta'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <AllowanceForm open={allowanceOpen} onClose={() => setAllowanceOpen(false)} />
      <BudgetConfig open={budgetConfigOpen} onClose={() => setBudgetConfigOpen(false)} />
    </div>
  )
}
