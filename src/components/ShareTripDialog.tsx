// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'qrcode'
import { Copy, Share2, Check, Mail, MessageCircle, Send } from 'lucide-react'
import { ResponsiveOverlay } from '@/components/ui/ResponsiveOverlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { generateShareableUrl } from '@/lib/tripCodeGenerator'
import { logger } from '@/lib/logger'

interface ShareTripDialogProps {
  tripCode: string
  tripName: string
  trigger?: React.ReactNode
}

export function ShareTripDialog({ tripCode, tripName, trigger }: ShareTripDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const shareUrl = generateShareableUrl(tripCode)

  // Generate QR code when dialog opens
  useEffect(() => {
    if (open && !qrCodeUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(url => setQrCodeUrl(url))
        .catch(err => logger.error('Error generating QR code:', { error: String(err) }))
    }
  }, [open, shareUrl, qrCodeUrl])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: t('share.linkCopied'),
        description: t('share.linkCopiedDesc'),
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      logger.error('Error copying to clipboard:', { error: String(err) })
      toast({
        title: t('share.copyFailed'),
        description: t('share.copyFailedDesc'),
        variant: 'destructive',
      })
    }
  }

  const handleShareVia = (method: 'whatsapp' | 'email' | 'sms') => {
    const message = t('share.joinTripMessage', { name: tripName, url: shareUrl })

    let url = ''
    switch (method) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(message)}`
        break
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(t('share.joinSubject', { name: tripName }))}&body=${encodeURIComponent(message)}`
        break
      case 'sms':
        url = `sms:?body=${encodeURIComponent(message)}`
        break
    }

    window.open(url, '_blank')
  }

  const handleNativeShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: t('share.joinSubject', { name: tripName }),
          text: t('share.joinTripMessage', { name: tripName, url: shareUrl }),
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or error occurred
        logger.info('Share cancelled or failed:', { error: String(err) })
      }
    } else {
      // Fallback to copy
      handleCopyLink()
    }
  }

  return (
    <>
      {/* Trigger button — clicks open the overlay */}
      <span onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Share2 size={16} />
            {t('share.shareTrip')}
          </Button>
        )}
      </span>

      <ResponsiveOverlay open={open} onClose={() => setOpen(false)} title={t('share.shareTrip')} maxWidth="sm:max-w-md">
        <p className="text-sm text-muted-foreground mb-4">
          {t('share.shareDescription')}
        </p>

        <div className="space-y-4">
          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-border">
                <img src={qrCodeUrl} alt={t('share.tripQrCode')} className="w-48 h-48" />
              </div>
            </div>
          )}

          {/* URL Display */}
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="flex-1 font-mono text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="icon"
              variant={copied ? 'default' : 'outline'}
              onClick={handleCopyLink}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>

          {/* Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('share.shareVia')}</p>
            <div className="grid grid-cols-2 gap-2">
              {'share' in navigator && (
                <Button
                  variant="outline"
                  className="gap-2 w-full"
                  onClick={handleNativeShare}
                >
                  <Share2 size={16} />
                  {t('share.share')}
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => handleShareVia('whatsapp')}
              >
                <MessageCircle size={16} />
                {t('share.whatsApp')}
              </Button>
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => handleShareVia('email')}
              >
                <Mail size={16} />
                {t('common.email')}
              </Button>
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => handleShareVia('sms')}
              >
                <Send size={16} />
                {t('share.sms')}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {t('share.privacyNote')}
            </p>
          </div>
        </div>
      </ResponsiveOverlay>
    </>
  )
}
