import { ParticipantBalance, formatBalance, getBalanceColorClass } from '@/services/balanceCalculator'
import { motion } from 'framer-motion'

interface QuickBalanceHeroProps {
  balance: ParticipantBalance | null
}

export function QuickBalanceHero({ balance }: QuickBalanceHeroProps) {
  if (!balance) {
    return (
      <div className="text-center py-8 mb-6">
        <p className="text-muted-foreground">No balance data available</p>
      </div>
    )
  }

  const isSettled = balance.balance === 0
  const isPositive = balance.balance > 0

  return (
    <motion.div
      className="text-center py-8 mb-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-sm text-muted-foreground mb-2">
        {isSettled
          ? 'All settled up!'
          : isPositive
            ? 'You are owed'
            : 'You owe'
        }
      </p>
      <p className={`text-4xl font-bold tabular-nums ${getBalanceColorClass(balance.balance)}`}>
        {isSettled
          ? formatBalance(0)
          : formatBalance(balance.balance).replace(/^[+-]/, '')
        }
      </p>
      {balance.isFamily && (
        <p className="text-xs text-muted-foreground mt-2">
          Family: {balance.name}
        </p>
      )}
    </motion.div>
  )
}
