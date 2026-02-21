import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, X, ScanLine } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useReceiptContext } from '@/contexts/ReceiptContext'
import { useCurrentTrip } from '@/hooks/useCurrentTrip'
import { logger } from '@/lib/logger'

interface ReceiptCaptureSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId?: string
  onScanned: (taskId: string) => void
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to convert image to base64'))
    reader.readAsDataURL(blob)
  })
}

export function ReceiptCaptureSheet({ open, onOpenChange, onScanned }: ReceiptCaptureSheetProps) {
  const { currentTrip } = useCurrentTrip()
  const { createReceiptTask, refreshPendingReceipts } = useReceiptContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelected = (file: File) => {
    setError(null)
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleScan = async () => {
    if (!selectedFile || !currentTrip) return
    setScanning(true)
    setError(null)

    try {
      // 1. Compress image
      const compressed = await compressImage(selectedFile)
      const base64 = await blobToBase64(compressed)

      // 2. Create receipt_tasks row (pending)
      const task = await createReceiptTask(currentTrip.id)
      if (!task) {
        setError('Failed to create receipt task. Please try again.')
        setScanning(false)
        return
      }

      // 3. Invoke edge function synchronously
      logger.info('Invoking process-receipt', { task_id: task.id })
      const { data, error: fnError } = await supabase.functions.invoke('process-receipt', {
        body: {
          receipt_task_id: task.id,
          image_base64: base64,
          mime_type: 'image/jpeg',
        },
      })

      if (fnError) {
        // Supabase wraps 4xx/5xx responses in fnError — try to extract the actual JSON body
        let message = 'Failed to process receipt'
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const body = await (fnError as any).context?.json?.()
          message = body?.error ?? fnError.message ?? message
        } catch {
          message = fnError.message ?? message
        }
        logger.error('process-receipt failed', { error: message, task_id: task.id })
        setError(message)
        setScanning(false)
        return
      }

      if (!data?.ok) {
        const message = data?.error ?? 'Failed to process receipt'
        logger.error('process-receipt returned not-ok', { error: message, task_id: task.id })
        setError(message)
        setScanning(false)
        return
      }

      // 4. Success — refresh pending list, notify parent, close
      await refreshPendingReceipts()
      onScanned(task.id)
      handleReset()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      logger.error('Receipt capture failed', { error: message })
      setError(message)
    } finally {
      setScanning(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !scanning) {
      handleReset()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <ScanLine size={20} />
            Scan Receipt
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {!previewUrl ? (
            /* File selection state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <Camera size={40} className="text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Add a receipt photo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Take a photo or upload from your library
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-xs">
                {/* Camera capture (mobile) */}
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={16} />
                  Take Photo
                </Button>

                {/* File picker */}
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  Choose from Library
                </Button>
              </div>

              {/* Hidden file inputs */}
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
            /* Preview state */
            <div className="flex-1 flex flex-col gap-4">
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full max-h-64 object-contain bg-muted"
                />
                {!scanning && (
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 rounded-full bg-background/80 p-1 border border-border"
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <Button
                onClick={handleScan}
                disabled={scanning}
                size="lg"
                className="gap-2"
              >
                {scanning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing receipt...
                  </>
                ) : (
                  <>
                    <ScanLine size={16} />
                    Scan Receipt
                  </>
                )}
              </Button>

              {scanning && (
                <p className="text-xs text-muted-foreground text-center">
                  This usually takes 5–10 seconds
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
