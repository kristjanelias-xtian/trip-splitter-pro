// SPDX-License-Identifier: Apache-2.0
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Home, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function TripNotFoundPage() {
  const { t } = useTranslation()
  const { tripCode } = useParams<{ tripCode: string }>()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t('trip.tripNotFound')}
              </h1>
              <p className="text-muted-foreground">
                {t('trip.tripNotFoundDesc', { code: tripCode })}
              </p>
            </div>

            {/* Suggestions */}
            <div className="bg-muted/50 p-4 rounded-lg text-left space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {t('trip.whatYouCanDo')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('trip.checkForTypos')}</li>
                <li>• {t('trip.askOrganizer')}</li>
                <li>• {t('trip.goBackToList')}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate('/')}
                className="w-full gap-2"
              >
                <Home size={16} />
                {t('trip.goToMyTrips')}
              </Button>
              <Button
                onClick={() => navigate(-1)}
                variant="outline"
                className="w-full gap-2"
              >
                <Search size={16} />
                {t('trip.goBack')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
