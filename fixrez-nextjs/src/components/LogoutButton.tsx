import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
}

function LogoutButton({ className }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    console.log('🖱️ LogoutButton: clicked')
    setLoading(true)
    try {
      // Sign out using NextAuth
      await signOut({ redirect: false })
      console.log('✅ LogoutButton: NextAuth signOut successful')
      
      // Navigate after successful logout
      router.push('/?logout=1')
    } catch (e) {
      console.error('❌ LogoutButton: error', e)
      router.push('/?logout_error=1')
    } finally {
      // Safety: if navigation fails or is blocked, allow retry
      setTimeout(() => setLoading(false), 1500)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={className}
      disabled={loading}
      aria-disabled={loading}
    >
      {loading ? 'Logging out…' : 'Logout'}
    </button>
  )
}

export default LogoutButton