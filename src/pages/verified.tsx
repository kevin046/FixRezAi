import { useAuthStore } from '@/stores/authStore'

export default function VerifiedPage() {
  const { user } = useAuthStore()
  const displayName = (user?.user_metadata as any)?.first_name || user?.email?.split('@')[0] || ''
  const goDashboard = () => { window.location.assign('/dashboard') }
  const goHome = () => { window.location.assign('/') }
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 shadow-xl p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Email verified</h1>
          <p className="text-base text-gray-700 dark:text-gray-200 font-medium mb-3">Welcome{displayName ? `, ${displayName}` : ''}.</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Thank you for confirming your email. Your account is now active and ready to use. You can access your dashboard to optimize your resume and manage your settings.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button onClick={goDashboard} className="w-full py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700">Go to Dashboard</button>
            <button onClick={goHome} className="w-full py-2 rounded-xl text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  )
}
