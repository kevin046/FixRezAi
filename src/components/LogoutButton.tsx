import { useState } from 'react'
import { secureLogout } from '@/lib/auth'

interface LogoutButtonProps {
  className?: string
}

function LogoutButton({ className }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    console.log('🖱️ LogoutButton: clicked')
    setLoading(true)
    try {
      const res = await secureLogout()
      console.log('✅ LogoutButton: result', res)
      if (res.success) {
        // Navigate after successful logout
        const target = '/?logout=1'
        // Use replace to avoid back navigation re-entering auth state
        window.location.replace(target)
      } else {
        window.location.replace('/?logout_error=1')
      }
    } catch (e) {
      console.error('❌ LogoutButton: error', e)
      window.location.replace('/?logout_error=1')
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