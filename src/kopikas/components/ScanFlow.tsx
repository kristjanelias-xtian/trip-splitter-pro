// SPDX-License-Identifier: Apache-2.0
import { useState, useRef } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWallet } from '../hooks/useWallet'
import { usePet } from '../hooks/usePet'
import { CategoryPicker } from './CategoryPicker'
import { getCategoryEmoji } from '../lib/kopikasCategories'
import { getXpForAction } from '../lib/xpCalculator'
import { supabase } from '@/lib/supabase'
import { withTimeout } from '@/lib/fetchWithTimeout'
import type { KopikasCategory } from '../types'
import { X, Camera, ArrowLeft, Loader2 } from 'lucide-react'

interface ScanFlowProps {
  open: boolean
  onClose: () => void
}

interface ScannedItem {
  name: string
  price: number
  qty: number
  category: KopikasCategory
}

type Step = 'camera' | 'review' | 'confirm'

export function ScanFlow({ open, onClose }: ScanFlowProps) {
  const { wallet, addTransaction } = useWallet()
  const { awardXp } = usePet()
  const [step, setStep] = useState<Step>('camera')
  const [items, setItems] = useState<ScannedItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !wallet) return

    setProcessing(true)
    setError(null)

    try {
      // Convert to base64
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

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
      if (!parsed.items || parsed.items.length === 0) {
        throw new Error('No items found')
      }

      setItems(parsed.items.map((item: { name?: string; price?: number; qty?: number; category?: string }) => ({
        name: item.name || 'Tundmatu',
        price: Number(item.price) || 0,
        qty: Number(item.qty) || 1,
        category: (item.category as KopikasCategory) || 'other',
      })))
      setStep('review')
    } catch {
      setError('Hmm, ma ei saanud aru. Proovi uuesti! 📸')
    } finally {
      setProcessing(false)
    }
  }

  const handleCategoryChange = (index: number, category: KopikasCategory) => {
    const original = items[index]
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, category } : item
    ))
    setEditingCategory(null)

    // Record correction for AI learning (fire and forget)
    if (original.category !== category && wallet) {
      supabase.from('wallet_category_corrections' as any)
        .insert({
          wallet_id: wallet.id,
          item_description: original.name,
          original_category: original.category,
          corrected_category: category,
        } as any)
        .then(() => {
          awardXp(getXpForAction('correct_category'))
        })
    }
  }

  const handleConfirm = async () => {
    if (!wallet || items.length === 0) return
    setSubmitting(true)

    try {
      // Create one transaction per item
      for (const item of items) {
        await addTransaction({
          wallet_id: wallet.id,
          type: 'expense',
          amount: item.price,
          description: item.name,
          category: item.category,
        })
      }

      // Award flat 10 XP for the scan action (not per item — prevents inflation from grocery receipts)
      await awardXp(getXpForAction('log_expense'))

      resetAndClose()
    } catch {
      setError('Salvestamine ebaõnnestus. Proovi uuesti!')
    } finally {
      setSubmitting(false)
    }
  }

  const resetAndClose = () => {
    onClose()
    setTimeout(() => {
      setStep('camera')
      setItems([])
      setError(null)
      setEditingCategory(null)
    }, 300)
  }

  return (
    <Sheet open={open} onOpenChange={isOpen => { if (!isOpen) resetAndClose() }}>
      <SheetContent side="bottom" hideClose className="flex flex-col p-0 rounded-t-2xl" style={{ height: '92dvh' }}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          {step !== 'camera' ? (
            <button onClick={() => { setStep('camera'); setItems([]); setError(null) }} aria-label="Back"
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : <div className="w-8" />}
          <SheetTitle>
            {step === 'camera' ? 'Skanni kviitung' : step === 'review' ? 'Kontrolli' : 'Kinnita'}
          </SheetTitle>
          <button onClick={resetAndClose} aria-label="Close"
            className="rounded-full w-8 h-8 flex items-center justify-center border border-border hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {step === 'camera' && (
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
                    📸 Ava kaamera
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
          )}

          {step === 'review' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Kontrolli kategooriaid. Vajuta emojit, et muuta.
              </p>
              {items.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 py-2">
                    <button
                      onClick={() => setEditingCategory(editingCategory === i ? null : i)}
                      className="text-xl shrink-0"
                      aria-label="Change category"
                    >
                      {getCategoryEmoji(item.category)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.name}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">€{item.price.toFixed(2)}</span>
                  </div>
                  {editingCategory === i && (
                    <div className="ml-8 mb-2">
                      <CategoryPicker
                        selected={item.category}
                        onSelect={cat => handleCategoryChange(i, cat)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>

        {/* Sticky footer — review step only */}
        {step === 'review' && (
          <div className="shrink-0 p-4 border-t border-border">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Kokku</span>
              <span className="font-medium tabular-nums">
                €{items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
              </span>
            </div>
            <button onClick={handleConfirm} disabled={submitting}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
              {submitting ? 'Salvestan...' : `Kinnita ${items.length} kirjet`}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
