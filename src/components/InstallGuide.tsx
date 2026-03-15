// SPDX-License-Identifier: Apache-2.0
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, Smartphone } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface InstallGuideProps {
  variant: 'banner' | 'settings'
  onDismiss?: () => void
}

function IOSInstructions() {
  const { t } = useTranslation()
  return (
    <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
      <li>{t('settings.iosStep1')}</li>
      <li>{t('settings.iosStep2')}</li>
      <li>{t('settings.iosStep3')}</li>
    </ol>
  )
}

function AndroidInstructions() {
  const { t } = useTranslation()
  return (
    <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
      <li>{t('settings.androidStep1')}</li>
      <li>{t('settings.androidStep2')}</li>
      <li>{t('settings.androidStep3')}</li>
    </ol>
  )
}

function GenericInstructions() {
  const { t } = useTranslation()
  return (
    <p className="text-xs text-muted-foreground">
      {t('settings.genericInstall')}
    </p>
  )
}

function PlatformInstructions({ isIOS, isAndroid }: { isIOS: boolean; isAndroid: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="mt-3 space-y-3">
      {isIOS ? <IOSInstructions /> : isAndroid ? <AndroidInstructions /> : <GenericInstructions />}
      {(isIOS || isAndroid) && (
        <p className="text-xs text-muted-foreground/70 italic">
          {t('settings.homePageHint')}
        </p>
      )}
    </div>
  )
}

export function InstallGuide({ variant, onDismiss }: InstallGuideProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { isIOS, isAndroid } = usePWAInstall()

  if (variant === 'banner') {
    return (
      <div className="bg-muted/50 rounded-lg border border-border/50 p-3 mb-6">
        <div className="flex items-start gap-3">
          <Smartphone size={18} className="text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {t('settings.openLikeApp')}
              </p>
              <button
                onClick={onDismiss}
                aria-label="Dismiss"
                className="shrink-0 rounded-full w-6 h-6 flex items-center justify-center hover:bg-muted transition-colors -mt-0.5 -mr-0.5"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('settings.openInstantly')}
            </p>
            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-2 text-xs font-medium text-foreground hover:underline"
              >
                {t('settings.showMe')}
              </button>
            )}
            {expanded && (
              <PlatformInstructions isIOS={isIOS} isAndroid={isAndroid} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Settings variant — uses Card to match other ManageTripPage sections
  return (
    <Card>
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full text-left"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-muted-foreground shrink-0" />
              <CardTitle>{t('settings.openLikeApp')}</CardTitle>
            </div>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
          <CardDescription>{t('settings.worksLikeApp')}</CardDescription>
        </CardHeader>
      </button>
      {expanded && (
        <CardContent>
          <PlatformInstructions isIOS={isIOS} isAndroid={isAndroid} />
        </CardContent>
      )}
    </Card>
  )
}
