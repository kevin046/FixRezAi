import React from "react"
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

const AccessibilityPage: React.FC = () => {
  const { user } = useAuthStore()
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                aria-label="Go back"
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FixRez AI
              </a>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700 dark:text-gray-300">
                    Welcome, {user.email?.split('@')[0]}
                  </span>
                  <a
                    href="/settings"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    Settings
                  </a>
                  <LogoutButton className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { window.location.href = '/auth?mode=login' }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { window.location.href = '/auth?mode=register' }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Accessibility</h1>
        <p className="text-gray-600 mb-6">We aim to make FixRez AI usable for everyone.</p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 mt-2 mb-4">Standards</h2>
          <p className="text-gray-700 mb-4">The site follows WCAG 2.1 AA guidelines where possible, including semantic HTML, focus states, ARIA labels, and keyboard navigation.</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Keyboard Navigation</h2>
          <p className="text-gray-700 mb-4">All interactive elements are reachable via keyboard. Use Tab to move focus and Enter or Space to activate.</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Contrast</h2>
          <p className="text-gray-700 mb-4">We use accessible color palettes and support dark mode to maintain contrast across themes.</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Feedback</h2>
          <p className="text-gray-700">If you experience barriers, contact us via the Contact page or email hello@summitpixels.com.</p>
        </div>
      </div>
      
    </div>
  )
}

export default AccessibilityPage
