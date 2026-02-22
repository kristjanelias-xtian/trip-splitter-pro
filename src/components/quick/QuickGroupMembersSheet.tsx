import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { UserCheck } from 'lucide-react'
import { ParticipantBalance, formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { Participant } from '@/types/participant'

interface QuickGroupMembersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balances: ParticipantBalance[]
  myParticipantId: string | null
  currency: string
  participants: Participant[]
}

export function QuickGroupMembersSheet({
  open,
  onOpenChange,
  balances,
  myParticipantId,
  currency,
  participants,
}: QuickGroupMembersSheetProps) {
  function isLinked(balanceId: string): boolean {
    return !!participants.find(p => p.id === balanceId || p.family_id === balanceId)?.user_id
  }

  function statusText(balance: number): string {
    if (Math.abs(balance) < 0.005) return 'Settled up'
    const amount = formatBalance(Math.abs(balance), currency)
    return balance > 0 ? `Owed ${amount}` : `Owes ${amount}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex flex-col p-0 rounded-t-2xl"
        style={{ height: '75dvh' }}
      >
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <SheetTitle>Group ({balances.length} {balances.length === 1 ? 'member' : 'members'})</SheetTitle>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {balances.map((b, i) => {
            const isMe = b.id === myParticipantId
            const linked = isLinked(b.id)
            const settled = Math.abs(b.balance) < 0.005

            return (
              <div key={b.id}>
                <div className="flex items-center justify-between px-6 py-3.5 gap-3">
                  {/* Left: name + badges */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{b.name}</span>
                    {linked && (
                      <span title="Account linked">
                        <UserCheck size={12} className="text-green-600 dark:text-green-400 shrink-0" />
                      </span>
                    )}
                    {isMe && (
                      <span className="text-xs bg-accent/20 text-accent-foreground px-1.5 py-0.5 rounded shrink-0">
                        You
                      </span>
                    )}
                  </div>

                  {/* Right: amount + status */}
                  <div className="text-right shrink-0">
                    <p className={`font-medium tabular-nums text-sm ${settled ? 'text-muted-foreground' : getBalanceColorClass(b.balance)}`}>
                      {settled ? '—' : formatBalance(b.balance, currency)}
                    </p>
                    <p className={`text-xs mt-0.5 ${settled ? 'text-muted-foreground' : getBalanceColorClass(b.balance)}`}>
                      {statusText(b.balance)}
                    </p>
                  </div>
                </div>
                {i < balances.length - 1 && (
                  <div className="border-b border-border mx-6" />
                )}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
