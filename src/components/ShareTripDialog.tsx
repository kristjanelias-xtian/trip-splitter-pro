import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Copy, Share2, Check, Mail, MessageCircle, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { generateShareableUrl } from '@/lib/tripCodeGenerator'

interface ShareTripDialogProps {
  tripCode: string
  tripName: string
  trigger?: React.ReactNode
}

export function ShareTripDialog({ tripCode, tripName, trigger }: ShareTripDialogProps) {
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
        .catch(err => console.error('Error generating QR code:', err))
    }
  }, [open, shareUrl, qrCodeUrl])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: 'Link copied!',
        description: 'Share link has been copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying to clipboard:', err)
      toast({
        title: 'Copy failed',
        description: 'Please copy the link manually',
        variant: 'destructive',
      })
    }
  }

  const handleShareVia = (method: 'whatsapp' | 'email' | 'sms') => {
    const message = `Join our trip "${tripName}" on Split: ${shareUrl}`

    let url = ''
    switch (method) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(message)}`
        break
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`Join ${tripName}`)}&body=${encodeURIComponent(message)}`
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
          title: `Join ${tripName}`,
          text: `Join our trip "${tripName}" on Split`,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or error occurred
        console.log('Share cancelled or failed:', err)
      }
    } else {
      // Fallback to copy
      handleCopyLink()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Share2 size={16} />
            Share Trip
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Share this link with your group members. Anyone with the link can view and contribute to this trip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-border">
                <img src={qrCodeUrl} alt="Trip QR Code" className="w-48 h-48" />
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
            <p className="text-sm text-muted-foreground">Share via:</p>
            <div className="grid grid-cols-2 gap-2">
              {'share' in navigator && (
                <Button
                  variant="outline"
                  className="gap-2 w-full"
                  onClick={handleNativeShare}
                >
                  <Share2 size={16} />
                  Share
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => handleShareVia('whatsapp')}
              >
                <MessageCircle size={16} />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => handleShareVia('email')}
              >
                <Mail size={16} />
                Email
              </Button>
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => handleShareVia('sms')}
              >
                <Send size={16} />
                SMS
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Privacy Note:</strong> Anyone with this link can access the trip.
              Only share with trusted group members.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
