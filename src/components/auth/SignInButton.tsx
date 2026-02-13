import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'

export function SignInButton() {
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
      type="icon"
      shape="circle"
      theme="outline"
    />
  )
}
