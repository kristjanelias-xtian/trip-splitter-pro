// SPDX-License-Identifier: Apache-2.0
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Upload, Loader2, X, ScanLine, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useTripContext } from '@/contexts/TripContext'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { useIOSScrollFix } from '@/hooks/useIOSScrollFix'
import { useMediaQuery } from '@/hooks/useMediaQuery'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { createTrip, updateTrip } = useTripContext()
  const { createReceiptTask, refreshPendingReceipts } = useReceiptContext()
  const { refreshParticipants } = useParticipantContext()
  const keyboard = useKeyboardHeight()
  const scrollRef = useIOSScrollFix()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const isScanningRef = useRef(false)

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
    // Don't allow closing during scanning — the sheet must stay open
    // until the receipt is processed and the participant step is reached.
    if (step === 'scanning') return
    onOpenChange(false)
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
    if (!selectedFile || isScanningRef.current) return
    isScanningRef.current = true
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
        enable_activities: false,
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

      const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
      if (compressed.size > MAX_SIZE_BYTES) {
        throw new Error(t('receipt.imageTooLarge'))
      }

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
            target_language: navigator.language?.split('-')[0] ?? 'en',
          },
        }),
      ])

      // Write image path to task row — must complete before refreshPendingReceipts
      if (uploadResult.status === 'fulfilled' && !uploadResult.value.error) {
        await supabase.from('receipt_tasks').update({ receipt_image_path: uploadPath }).eq('id', task.id)
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
        // Mark task as 'failed' so it doesn't orphan in 'processing' state (FINDING-27)
        const errDetail =
          fnResult.status === 'rejected'
            ? String(fnResult.reason)
            : fnResult.value.error?.message ?? 'Unknown error'
        logger.warn('process-receipt did not return ok — marking task failed', { task_id: task.id, error: errDetail })
        supabase
          .from('receipt_tasks')
          .update({ status: 'failed', error_message: 'Processing failed — please try again' } as any)
          .eq('id', task.id)
          .eq('status', 'processing')
          .then(({ error: markErr }) => {
            if (markErr) logger.warn('Failed to mark receipt task as failed', { task_id: task.id, error: markErr.message })
          })
        setError('Failed to process receipt. Please try again.')
        setStep('camera')
        return
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
    } finally {
      isScanningRef.current = false
    }
  }

  const handleDone = () => {
    if (createdTripCode) {
      onOpenChange(false)
      navigate(isMobile ? `/t/${createdTripCode}/quick` : `/t/${createdTripCode}/manage`)
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

  const closeBtn = (
    <button
      onClick={handleClose}
      aria-label={t('common.close')}
      className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors"
    >
      <X className="w-4 h-4 text-muted-foreground" />
    </button>
  )

  const titleContent = (
    <>
      <ScanLine size={20} className="flex-shrink-0" />
      <span className="truncate">
        {step === 'camera' && t('receipt.scanAReceipt')}
        {step === 'scanning' && t('receipt.readingReceipt')}
        {step === 'participants' && (createdTripName ?? t('receipt.addPeople'))}
      </span>
    </>
  )

  const scrollContent = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
      {/* Step 1: Camera */}
      {step === 'camera' && (
        <div className="flex flex-col gap-4 h-full">
          {!previewUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <Camera size={40} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{t('receipt.addReceiptPhoto')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('receipt.newGroupCreatedAuto')}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button variant="default" className="gap-2" onClick={() => cameraInputRef.current?.click()}>
                  <Camera size={16} />
                  {t('receipt.takePhoto')}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} />
                  {t('receipt.chooseFromLibrary')}
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
                  alt={t('receipt.receiptPreview')}
                  className="w-full max-h-64 object-contain bg-muted"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 border border-border"
                  aria-label={t('receipt.removeImage')}
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
                {t('receipt.scanAndCreateGroup')}
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
            <p className="font-medium text-foreground">{t('receipt.readingReceipt')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('receipt.creatingGroupAndExtracting')}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{t('receipt.usuallyTakes')}</p>
        </div>
      )}

      {/* Step 3: Add participants */}
      {step === 'participants' && createdTripId && createdTripCode && createdTripName && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('receipt.addPeopleDesc')}
          </p>
          <QuickParticipantPicker
            tripId={createdTripId}
          />
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleDone}>
            {t('common.skipForNow')}
          </Button>
        </div>
      )}
    </div>
  )

  const stickyFooter = step === 'participants' ? (
    <div className="shrink-0 px-4 py-3 border-t border-border bg-background pwa-safe-bottom">
      <Button className="w-full gap-1" onClick={handleDone}>
        {t('common.done')}
        <ChevronRight size={14} />
      </Button>
    </div>
  ) : null

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          hideClose
          className="flex flex-col p-0 rounded-t-2xl"
          style={{
            height: keyboard.isVisible ? `${keyboard.availableHeight}px` : '92dvh',
            ...(keyboard.isVisible && {
              top: `${keyboard.viewportOffset}px`,
              bottom: 'auto',
            }),
          }}
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="w-8" />
            <SheetTitle className="text-base font-semibold flex items-center gap-2 truncate">
              {titleContent}
            </SheetTitle>
            {closeBtn}
          </div>
          {scrollContent}
          {stickyFooter}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideClose className="flex flex-col max-h-[85vh] max-w-lg p-0 gap-0">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <DialogTitle className="text-base font-semibold flex items-center gap-2 truncate">
            {titleContent}
          </DialogTitle>
          {closeBtn}
        </div>
        {scrollContent}
        {stickyFooter}
      </DialogContent>
    </Dialog>
  )
}
