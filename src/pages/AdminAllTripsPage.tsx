// SPDX-License-Identifier: Apache-2.0
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ExternalLink, Calendar, UserCircle, ShieldAlert } from 'lucide-react'
import { PageLoadingState } from '@/components/PageLoadingState'
import { PageErrorState } from '@/components/PageErrorState'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/types/trip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from 'react-i18next'
import { isAdminUser } from '@/lib/adminAuth'
import { generateShareableUrl } from '@/lib/tripCodeGenerator'
import { withTimeout } from '@/lib/fetchWithTimeout'
import { useAbortController } from '@/hooks/useAbortController'

export function AdminAllTripsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [allTrips, setAllTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'oldest'>('recent')
  const [ownerMap, setOwnerMap] = useState<Record<string, { name: string; email: string | null }>>({})
  const { newSignal, cancel } = useAbortController()

  const isAdmin = isAdminUser(user?.id)

  // Fetch all trips directly (bypasses TripContext client-side filtering)
  useEffect(() => {
    if (!isAdmin) return

    const signal = newSignal()

    const fetchAllTrips = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await withTimeout(
        supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false })
          .abortSignal(signal),
        15000,
        'Loading all trips timed out.'
      )

      if (signal.aborted) return

      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }

      setAllTrips((data as unknown as Trip[]) ?? [])
      setLoading(false)
    }

    fetchAllTrips()
    return cancel
  }, [isAdmin])

  // Fetch owner info for all trips
  useEffect(() => {
    if (!isAdmin || allTrips.length === 0) return

    const ownerIds = [...new Set(allTrips.map(t => t.created_by).filter(Boolean))] as string[]
    if (ownerIds.length === 0) return

    const signal = newSignal()

    const fetchOwners = async () => {
      const { data, error: fetchError } = await withTimeout<any>(
        (supabase as any)
          .from('user_profiles')
          .select('id, display_name, email')
          .in('id', ownerIds)
          .abortSignal(signal),
        15000,
        'Loading trip owners timed out.'
      )

      if (signal.aborted) return
      if (fetchError || !data) return

      const map: Record<string, { name: string; email: string | null }> = {}
      for (const profile of data) {
        map[profile.id] = { name: profile.display_name, email: profile.email }
      }
      setOwnerMap(map)
    }

    fetchOwners()
    return cancel
  }, [isAdmin, allTrips])

  const isStandalone =
    ('standalone' in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches

  const handleOpenTrip = (tripCode: string) => {
    if (isStandalone) {
      navigate(`/t/${tripCode}/dashboard`)
    } else {
      window.open(`/t/${tripCode}/dashboard`, '_blank')
    }
  }

  const handleCopyUrl = (tripCode: string) => {
    const url = generateShareableUrl(tripCode)
    navigator.clipboard.writeText(url)
  }

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Filter and sort trips
  const filteredTrips = allTrips
    .filter(trip => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        trip.name.toLowerCase().includes(query) ||
        trip.trip_code.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  // Access denied
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert size={20} className="text-destructive" />
              {t('admin.accessDenied')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {user
                ? t('admin.noAdminAccess')
                : t('admin.mustSignIn')}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.href = '/'}
            >
              {t('admin.goToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin view
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('admin.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.totalTrips', { count: allTrips.length })}
            </p>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <PageLoadingState />
        )}

        {error && !loading && (
          <PageErrorState error={error} onRetry={async () => {
            setRetrying(true)
            setError(null)
            setLoading(true)
            try {
              const signal = newSignal()
              const { data, error: fetchError } = await withTimeout(
                supabase
                  .from('trips')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .abortSignal(signal),
                15000,
                'Loading all trips timed out.'
              )
              if (fetchError) {
                setError(fetchError.message)
              } else {
                setAllTrips((data as unknown as Trip[]) ?? [])
              }
            } finally {
              setLoading(false)
              setRetrying(false)
            }
          }} retrying={retrying} />
        )}

        {!loading && !error && <>
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder={t('admin.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder={t('admin.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">{t('admin.mostRecent')}</SelectItem>
                  <SelectItem value="oldest">{t('admin.oldestFirst')}</SelectItem>
                  <SelectItem value="name">{t('admin.nameAZ')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trips Table */}
        {filteredTrips.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery ? t('admin.noTripsFound') : t('admin.noTripsYet')}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? t('admin.tryDifferentSearch') : t('admin.tripsWillAppear')}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (<>
          {/* Mobile: card layout */}
          <div className="lg:hidden space-y-3">
            {filteredTrips.map((trip) => (
              <Card
                key={trip.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleOpenTrip(trip.trip_code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{trip.name}</p>
                      <code className="text-xs text-muted-foreground">{trip.trip_code}</code>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(trip.start_date)}
                        </span>
                        <span>·</span>
                        <span>{t('admin.created')} {formatDate(trip.created_at)}</span>
                      </div>
                      {trip.created_by && ownerMap[trip.created_by] && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <UserCircle size={12} className="shrink-0" />
                          <span className="truncate">{ownerMap[trip.created_by].name}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenTrip(trip.trip_code)
                      }}
                    >
                      <ExternalLink size={14} />
                      {t('common.open')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table layout */}
          <Card className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.tripName')}</TableHead>
                  <TableHead>{t('admin.tripCode')}</TableHead>
                  <TableHead>{t('admin.startDate')}</TableHead>
                  <TableHead>{t('admin.owner')}</TableHead>
                  <TableHead>{t('admin.created')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((trip) => (
                  <TableRow
                    key={trip.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCopyUrl(trip.trip_code)}
                  >
                    <TableCell className="font-medium">{trip.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {trip.trip_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar size={14} />
                        {formatDate(trip.start_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {trip.created_by && ownerMap[trip.created_by] ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <UserCircle size={14} className="text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{ownerMap[trip.created_by].name}</div>
                            {ownerMap[trip.created_by].email && (
                              <div className="text-xs text-muted-foreground truncate">{ownerMap[trip.created_by].email}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(trip.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTrip(trip.trip_code)
                        }}
                      >
                        <ExternalLink size={14} />
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>)}

        {/* Info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {t('admin.tip')}
          </p>
        </div>
        </>}
    </div>
  )
}
