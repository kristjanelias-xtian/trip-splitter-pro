import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Loader2, X, ScanLine, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useTripContext } from '@/contexts/TripContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { QuickParticipantPicker } from './QuickParticipantPicker'
import { logger } from '@/lib/logger'

type Step = 'camera' | 'scanning' | 'participants'

interface QuickScanCreateFlowProps {
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
          blob => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = () => reject(new Error('Failed to convert image to base64'))
    reader.readAsDataURL(blob)
  })
}

function formatDate(iso: string): string {
  // Parse YYYY-MM-DD without timezone shift
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function QuickScanCreateFlow({ open, onOpenChange }: QuickScanCreateFlowProps) {
  const navigate = useNavigate()
  const { createTrip, updateTrip } = useTripContext()
  const { createReceiptTask, refreshPendingReceipts } = useReceiptContext()
  const { refreshParticipants } = useParticipantContext()
  const keyboard = useKeyboardHeight()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('camera')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Created trip info (available from step 2 onwards)
  const [createdTripId, setCreatedTripId] = useState<string | null>(null)
  const [createdTripCode, setCreatedTripCode] = useState<string | null>(null)
  const [createdTripName, setCreatedTripName] = useState<string | null>(null)

  const handleFileSelected = (file: File) => {
    setError(null)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
  }

  const handleReset = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError(null)
  }

  const handleClose = () => {
    if (createdTripCode) {
      // If group was created, navigate to it before closing
      onOpenChange(false)
      navigate(`/t/${createdTripCode}/quick`)
    } else {
      onOpenChange(false)
    }
    // Reset state after close animation
    setTimeout(() => {
      setStep('camera')
      handleReset()
      setCreatedTripId(null)
      setCreatedTripCode(null)
      setCreatedTripName(null)
    }, 300)
  }

  const handleScan = async () => {
    if (!selectedFile) return
    setStep('scanning')
    setError(null)

    try {
      const today = todayISO()

      // 1. Create the group with a placeholder name
      const placeholder = `New Group · ${formatDate(today)}`
      const newTrip = await createTrip({
        name: placeholder,
        start_date: today,
        end_date: today,
        event_type: 'event',
        tracking_mode: 'individuals',
      })

      if (!newTrip) {
        setError('Failed to create group. Please try again.')
        setStep('camera')
        return
      }

      setCreatedTripId(newTrip.id)
      setCreatedTripCode(newTrip.trip_code)
      setCreatedTripName(newTrip.name)

      // 2. Compress image + create receipt task
      const compressed = await compressImage(selectedFile)
      const base64 = await blobToBase64(compressed)
      const task = await createReceiptTask(newTrip.id)

      // 3. Run bucket upload and edge function in parallel
      const uploadPath = `${task.id}.jpg`
      const [uploadResult, fnResult] = await Promise.allSettled([
        supabase.storage.from('receipts').upload(uploadPath, compressed, { contentType: 'image/jpeg' }),
        supabase.functions.invoke('process-receipt', {
          body: {
            receipt_task_id: task.id,
            image_base64: base64,
            mime_type: 'image/jpeg',
          },
        }),
      ])

      // Write image path to task row (non-blocking)
      if (uploadResult.status === 'fulfilled' && !uploadResult.value.error) {
        supabase.from('receipt_tasks').update({ receipt_image_path: uploadPath }).eq('id', task.id)
      } else {
        const errMsg =
          uploadResult.status === 'rejected'
            ? String(uploadResult.reason)
            : (uploadResult.value.error?.message ?? 'Unknown error')
        logger.warn('Receipt image upload failed (non-blocking)', { task_id: task.id, error: errMsg })
      }

      // Extract merchant + date from edge function result, update group name
      let autoName = placeholder
      if (fnResult.status === 'fulfilled' && !fnResult.value.error && fnResult.value.data?.ok) {
        const { merchant, date } = fnResult.value.data as { merchant?: string; date?: string | null }
        const displayDate = date ? formatDate(date) : formatDate(today)
        autoName = `${merchant ?? 'Group'} · ${displayDate}`
        // Update group name async — don't block the UI
        updateTrip(newTrip.id, { name: autoName }).catch(err =>
          logger.warn('Failed to update group name after scan', { error: String(err) })
        )
        setCreatedTripName(autoName)
      } else {
        const errDetail =
          fnResult.status === 'rejected'
            ? String(fnResult.reason)
            : fnResult.value.error?.message ?? 'Unknown error'
        logger.warn('process-receipt did not return ok', { error: errDetail })
        // Non-fatal: group is created, just won't have a merchant name
      }

      await refreshPendingReceipts()
      await refreshParticipants()

      // Move to participant step
      setStep('participants')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      logger.error('QuickScanCreateFlow failed', { error: message })
      setError(message)
      setStep('camera')
    }
  }

  const handleDone = () => {
    if (createdTripCode) {
      onOpenChange(false)
      navigate(`/t/${createdTripCode}/quick`)
    } else {
      onOpenChange(false)
    }
    setTimeout(() => {
      setStep('camera')
      handleReset()
      setCreatedTripId(null)
      setCreatedTripCode(null)
      setCreatedTripName(null)
    }, 300)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="flex flex-col p-0 rounded-t-2xl"
        style={{
          height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
          bottom: keyboard.isVisible ? `${keyboard.keyboardHeight}px` : undefined,
        }}
      >
        {/* Sticky header */}
        <div className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between">
          <SheetTitle className="flex items-center gap-2">
            <ScanLine size={20} />
            {step === 'camera' && 'Scan a Receipt'}
            {step === 'scanning' && 'Reading receipt…'}
            {step === 'participants' && (createdTripName ?? 'Add People')}
          </SheetTitle>
          {step === 'participants' && (
            <Button size="sm" onClick={handleDone} className="gap-1">
              Done
              <ChevronRight size={14} />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Camera */}
          {step === 'camera' && (
            <div className="flex flex-col gap-4 h-full">
              {!previewUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <Camera size={40} className="text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">Add a receipt photo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      A new group will be created automatically
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button variant="default" className="gap-2" onClick={() => cameraInputRef.current?.click()}>
                      <Camera size={16} />
                      Take Photo
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Upload size={16} />
                      Choose from Library
                    </Button>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="w-full max-h-64 object-contain bg-muted"
                    />
                    <button
                      onClick={handleReset}
                      className="absolute top-2 right-2 rounded-full bg-background/80 p-1 border border-border"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  <Button onClick={handleScan} size="lg" className="gap-2">
                    <ScanLine size={16} />
                    Scan & Create Group
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Scanning */}
          {step === 'scanning' && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 size={36} className="animate-spin text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Reading your receipt…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Creating your group and extracting items
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Usually takes 5–10 seconds</p>
            </div>
          )}

          {/* Step 3: Add participants */}
          {step === 'participants' && createdTripId && createdTripCode && createdTripName && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add people to split the receipt with. You can always add more later.
              </p>
              <QuickParticipantPicker
                tripId={createdTripId}
                tripCode={createdTripCode}
                tripName={createdTripName}
              />
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleDone}>
                Skip for now
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
