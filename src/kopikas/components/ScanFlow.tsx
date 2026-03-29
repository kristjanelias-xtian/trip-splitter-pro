// SPDX-License-Identifier: Apache-2.0
import { useState, useRef } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWallet } from '../hooks/useWallet'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { logger } from '@/lib/logger'
import type { KopikasCategory } from '../types'
import { X, Camera, Loader2 } from 'lucide-react'

/** Resize image to fit within maxDim, returns data URL (JPEG). */
function resizeImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Image load failed'))
    }
    img.src = URL.createObjectURL(file)
  })
}

interface ScanFlowProps {
  open: boolean
  onClose: () => void
  onScanComplete: (data: {
    amount: number
    vendor: string
    items: Array<{ description: string; amount: number; category: KopikasCategory }>
    receiptImagePath?: string
    receiptBatchId?: string
  }) => void
}

export function ScanFlow({ open, onClose, onScanComplete }: ScanFlowProps) {
  const { wallet } = useWallet()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !wallet) return

    setProcessing(true)
    setError(null)

    try {
      // Resize image to max 1600px to keep payload small for the edge function
      const base64 = await resizeImage(file, 1600)

      // Call edge function
      const { data, error: fnError } = await withTimeout(
        supabase.functions.invoke('process-kopikas-receipt', {
          body: { wallet_code: wallet.wallet_code, image: base64 },
        }),
        55000,
        'Kviitungi töötlemine aegus. Proovi uuesti!'
      )

      if (fnError) throw fnError

      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      if (!parsed?.items || parsed.items.length === 0) {
        throw new Error('No items found')
      }

      const receiptImagePath = parsed.receipt_image_path || undefined
      const receiptBatchId = crypto.randomUUID()
      const merchant = parsed.merchant || ''

      const items = parsed.items.map((item: { name?: string; price?: number; qty?: number; category?: string }) => ({
        description: item.name || 'Tundmatu',
        amount: Number(item.price) || 0,
        category: (item.category as KopikasCategory) || 'other',
      }))

      const total = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)

      onScanComplete({
        amount: total,
        vendor: merchant,
        items,
        receiptImagePath,
        receiptBatchId,
      })

      resetAndClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('Receipt scan failed', { error: msg, wallet_code: wallet.wallet_code })
      setError(msg === 'No items found'
        ? 'Ei leidnud kviitungilt midagi. Proovi uuesti!'
        : 'Hmm, midagi läks valesti. Proovi uuesti!')
    } finally {
      setProcessing(false)
    }
  }

  const resetAndClose = () => {
    onClose()
    setTimeout(() => {
      setError(null)
    }, 300)
  }

  return (
    <Sheet open={open} onOpenChange={isOpen => { if (!isOpen) resetAndClose() }}>
      <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '92dvh' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="w-8" />
          <SheetTitle>Skanni kviitung</SheetTitle>
          <button onClick={resetAndClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          <div className="flex flex-col items-center justify-center h-full gap-6">
            {processing ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Töötlen kviitungit...</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-center">Pildista oma kviitungit</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium"
                >
                  Ava kaamera
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCapture}
                  className="hidden"
                />
                {error && (
                  <div className="text-center">
                    <p className="text-sm mb-3">{error}</p>
                    <button onClick={() => { setError(null); fileInputRef.current?.click() }}
                      className="text-sm text-primary hover:underline">
                      Proovi uuesti
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
