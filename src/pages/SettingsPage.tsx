import { Card, CardContent } from '@/components/ui/card'

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">
        Settings
      </h2>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Settings and configuration options
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
