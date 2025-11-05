
import React from "react";
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'

const PrivacyPolicy: React.FC = () => {
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
      {/* Navigation identical to index */}
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Privacy Policy</h1>
        <p className="text-gray-600 mb-6">FixRez AI (fixrez.com) is owned and operated by Summit Pixels Inc.</p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-700 mb-4">
            This Privacy Policy describes how FixRez ("we", "us", or "our") collects, uses, and discloses your personal information when you use our website (the "Service").
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Information We Collect</h2>
          <p className="text-gray-700 mb-4">
            We may collect personal information that you provide to us, such as your name, email address, and other contact information. We may also collect information automatically when you use the Service, such as your IP address, browser type, and operating system.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">
            We may use the information we collect to provide and improve the Service, to communicate with you, and to comply with legal obligations. We will not sell or rent your personal information to third parties. All personal information is managed in accordance with Canadian privacy laws.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Data Security</h2>
          <p className="text-gray-700 mb-4">
            We take reasonable measures to protect your personal information from unauthorized access, use, or disclosure. However, no method of transmission over the internet or electronic storage is 100% secure.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Changes to This Privacy Policy</h2>
          <p className="text-gray-700 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Contact Us</h2>
        
          <p className="text-gray-700">
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
      {/* Footer identical to index */}
      <footer className="py-10 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Summit Pixels Inc.</p>
            <div className="flex items-center gap-6 text-sm">
              <a href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</a>
              <a href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</a>
              <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
