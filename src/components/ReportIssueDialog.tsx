import { useState, useRef } from 'react'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
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
  return Promise.race([
    new Promise<Blob>((resolve, reject) => {
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
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Image compression timed out')), 10000)
    ),
  ])
}

const MAX_SCREENSHOTS = 5

export function ReportIssueDialog({ open, onOpenChange }: ReportIssueDialogProps) {
  const { toast } = useToast()
  const keyboard = useKeyboardHeight()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = MAX_SCREENSHOTS - screenshots.length
    const toAdd = files.slice(0, remaining)
    const newPreviews = toAdd.map(f => URL.createObjectURL(f))
    setScreenshots(prev => [...prev, ...toAdd])
    setPreviews(prev => [...prev, ...newPreviews])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeScreenshot = (index: number) => {
    URL.revokeObjectURL(previews[index])
    setScreenshots(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    previews.forEach(url => URL.revokeObjectURL(url))
    setSubject('')
    setDescription('')
    setScreenshots([])
    setPreviews([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!subject.trim()) return

    setSubmitting(true)

    try {
      const metadata = [
        `**Page:** ${window.location.href}`,
        `**User Agent:** ${navigator.userAgent}`,
        `**Time:** ${new Date().toISOString()}`,
      ].join('\n')

      let screenshotMarkdown = ''
      if (screenshots.length > 0) {
        const blobs = await Promise.all(screenshots.map(f => compressImage(f)))
        const urls = await Promise.all(blobs.map(async (compressed) => {
          const fileName = `${Date.now()}-${crypto.randomUUID()}.jpg`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('feedback-screenshots')
            .upload(fileName, compressed, { contentType: 'image/jpeg' })
          if (uploadError) throw uploadError
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(uploadData.path)
          return publicUrl
        }))
        screenshotMarkdown = '\n\n**Screenshots:**\n' + urls.map((url, i) => `![Screenshot ${i + 1}](${url})`).join('\n')
      }

      const body = description.trim()
        ? `${description}${screenshotMarkdown}\n\n---\n${metadata}`
        : `${screenshotMarkdown ? screenshotMarkdown.trimStart() + '\n\n---\n' : ''}${metadata}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      try {
        const { error } = await supabase.functions.invoke('create-github-issue', {
          body: { title: subject.trim(), body },
        })
        clearTimeout(timeoutId)

        if (error) throw error
      } catch (err) {
        clearTimeout(timeoutId)
        if (controller.signal.aborted) {
          throw new Error('Request timed out')
        }
        throw err
      }

      toast({
        title: 'Feedback sent',
        description: 'Thank you! Your report has been submitted.',
      })

      resetForm()
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
      <DialogContent
        className="sm:max-w-md"
        style={keyboard.isVisible ? { marginBottom: keyboard.keyboardHeight } : undefined}
      >
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
            <Label>Screenshots (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative inline-block">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="h-20 w-20 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(i)}
                      className="absolute -top-2 -right-2 p-0.5 rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {screenshots.length < MAX_SCREENSHOTS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={16} />
                {screenshots.length === 0 ? 'Attach Screenshots' : 'Add More'}
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
