// SPDX-License-Identifier: Apache-2.0
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuickActionButtonProps {
  icon: LucideIcon
  label: string
  description: string
  onClick: () => void
  emphasis?: boolean
}

export function QuickActionButton({ icon: Icon, label, description, onClick, emphasis }: QuickActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border hover:bg-accent/50 hover:border-accent transition-colors text-left ${emphasis ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon size={22} className="text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  )
}
