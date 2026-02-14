import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) return

    setSubmitting(true)

    try {
      const metadata = [
        `**Page:** ${window.location.href}`,
        `**User Agent:** ${navigator.userAgent}`,
        `**Time:** ${new Date().toISOString()}`,
      ].join('\n')

      const body = description.trim()
        ? `${description}\n\n---\n${metadata}`
        : metadata

      const { data, error } = await supabase.functions.invoke('create-github-issue', {
        body: { title: subject.trim(), body },
      })

      if (error) throw error

      toast({
        title: 'Feedback sent',
        description: data?.url
          ? 'Thank you! Your report has been submitted.'
          : 'Thank you! Your report has been submitted.',
      })

      setSubject('')
      setDescription('')
      onOpenChange(false)
    } catch (err) {
      console.error('Error submitting issue:', err)
      toast({
        title: 'Failed to send feedback',
        description: 'Please try again later.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Found a bug or have feedback? Let us know and we'll look into it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issue-subject">Subject</Label>
            <Input
              id="issue-subject"
              placeholder="Brief description of the issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-description">Details (optional)</Label>
            <Textarea
              id="issue-description"
              placeholder="What happened? What did you expect to happen?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !subject.trim()}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
