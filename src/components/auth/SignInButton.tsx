import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

export function SignInButton() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={signInWithGoogle}
      disabled={loading}
      className="gap-2"
    >
      <LogIn size={16} />
      <span className="hidden sm:inline">Sign in</span>
    </Button>
  )
}
