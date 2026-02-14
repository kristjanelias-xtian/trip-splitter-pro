import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'

interface SignInButtonProps {
  type?: 'icon' | 'standard'
}

export function SignInButton({ type = 'icon' }: SignInButtonProps) {
  const { signInWithGoogle } = useAuth()

  return (
    <GoogleLogin
      onSuccess={(response) => {
        if (response.credential) {
          signInWithGoogle(response.credential)
        }
      }}
      onError={() => {
        console.error('Google Sign-In failed')
      }}
      size="medium"
      type={type}
      shape={type === 'icon' ? 'circle' : undefined}
      theme="outline"
    />
  )
}
