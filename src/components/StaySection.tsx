import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { useStayContext } from '@/contexts/StayContext'
import { StayForm } from './StayForm'
import { StayCard } from './StayCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function StaySection() {
  const { stays, loading } = useStayContext()
  const [showForm, setShowForm] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accommodations</CardTitle>
        <CardDescription>Manage where you're staying during the trip</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-4">Loading accommodations...</p>
        )}

        {!loading && stays.length === 0 && !showForm && (
          <div className="text-center py-6">
            <Building2 size={32} className="mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No accommodations added yet
            </p>
          </div>
        )}

        {!loading && stays.length > 0 && (
          <div className="space-y-3">
            {stays.map((stay) => (
              <StayCard key={stay.id} stay={stay} />
            ))}
          </div>
        )}

        {showForm ? (
          <StayForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="w-full"
          >
            <Plus size={16} className="mr-2" />
            Add Accommodation
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
