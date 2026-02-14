import { useState, useRef } from 'react'
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
import { Loader2, ImagePlus, X } from 'lucide-react'

interface ReportIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const maxWidth = 1200
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        0.8
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshot(file)
    const url = URL.createObjectURL(file)
    setScreenshotPreview(url)
  }

  const removeScreenshot = () => {
    setScreenshot(null)
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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

      let screenshotMarkdown = ''
      if (screenshot) {
        const compressed = await compressImage(screenshot)
        const fileName = `${Date.now()}-${crypto.randomUUID()}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(fileName, compressed, { contentType: 'image/jpeg' })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage
          .from('feedback-screenshots')
          .getPublicUrl(uploadData.path)
        screenshotMarkdown = `\n\n**Screenshot:**\n![Screenshot](${publicUrl})`
      }

      const body = description.trim()
        ? `${description}${screenshotMarkdown}\n\n---\n${metadata}`
        : `${screenshotMarkdown ? screenshotMarkdown.trimStart() + '\n\n---\n' : ''}${metadata}`

      const { error } = await supabase.functions.invoke('create-github-issue', {
        body: { title: subject.trim(), body },
      })

      if (error) throw error

      toast({
        title: 'Feedback sent',
        description: 'Thank you! Your report has been submitted.',
      })

      setSubject('')
      setDescription('')
      removeScreenshot()
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

          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="h-24 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={removeScreenshot}
                  className="absolute -top-2 -right-2 p-0.5 rounded-full bg-destructive text-destructive-foreground shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={16} />
                Attach Screenshot
              </Button>
            )}
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
