import { useState } from 'react'
import { Bug } from 'lucide-react'
import { ReportIssueDialog } from '@/components/ReportIssueDialog'

interface ReportIssueButtonProps {
  onGradient?: boolean
}

export function ReportIssueButton({ onGradient = false }: ReportIssueButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`p-2 rounded-md transition-colors ${
          onGradient
            ? 'text-white/70 hover:text-white hover:bg-white/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }`}
        title="Report an issue"
      >
        <Bug size={18} />
      </button>
      <ReportIssueDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
