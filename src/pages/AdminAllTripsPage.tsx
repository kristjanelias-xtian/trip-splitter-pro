import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LogOut, ExternalLink, Calendar, Users, UserCircle } from 'lucide-react'
import { useTripContext } from '@/contexts/TripContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { isAdminAuthenticated, authenticateAdmin, logoutAdmin, getAdminPasswordHint } from '@/lib/adminAuth'
import { generateShareableUrl } from '@/lib/tripCodeGenerator'

export function AdminAllTripsPage() {
  const navigate = useNavigate()
  const { trips } = useTripContext()
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'oldest'>('recent')
  const [ownerMap, setOwnerMap] = useState<Record<string, { name: string; email: string | null }>>({})

  useEffect(() => {
    setAuthenticated(isAdminAuthenticated())
  }, [])

  // Fetch owner info for all trips
  useEffect(() => {
    if (!authenticated || trips.length === 0) return

    const ownerIds = [...new Set(trips.map(t => t.created_by).filter(Boolean))] as string[]
    if (ownerIds.length === 0) return

    const fetchOwners = async () => {
      const { data, error: fetchError } = await (supabase as any)
        .from('user_profiles')
        .select('id, display_name, email')
        .in('id', ownerIds)

      if (fetchError || !data) return

      const map: Record<string, { name: string; email: string | null }> = {}
      for (const profile of data) {
        map[profile.id] = { name: profile.display_name, email: profile.email }
      }
      setOwnerMap(map)
    }

    fetchOwners()
  }, [authenticated, trips])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (authenticateAdmin(password)) {
      setAuthenticated(true)
      setError('')
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  const handleLogout = () => {
    logoutAdmin()
    setAuthenticated(false)
    navigate('/')
  }

  const handleOpenTrip = (tripCode: string) => {
    window.open(`/t/${tripCode}/dashboard`, '_blank')
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
  const filteredTrips = trips
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

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                {import.meta.env.DEV && (
                  <p className="text-xs text-muted-foreground">
                    {getAdminPasswordHint()}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin view
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Trips (Admin)</h1>
            <p className="text-muted-foreground mt-1">
              Total: {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut size={16} />
            Logout
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
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
                  {searchQuery ? 'No trips found' : 'No trips yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Trips will appear here as they are created'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip Name</TableHead>
                  <TableHead>Trip Code</TableHead>
                  <TableHead>Tracking Mode</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="capitalize">
                      <div className="flex items-center gap-1 text-sm">
                        <Users size={14} />
                        {trip.tracking_mode === 'families' ? 'Families' : 'Individuals'}
                      </div>
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
        )}

        {/* Info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Click any row to copy the trip URL to clipboard.
            Click "Open" to view the trip in a new tab.
          </p>
        </div>
      </div>
    </div>
  )
}
