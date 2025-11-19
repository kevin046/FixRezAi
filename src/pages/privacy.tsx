import React, { useState } from "react";
import { useAuthStore } from '@/stores/authStore'
import { Home, LayoutDashboard, Settings, Menu, X, ChevronRight } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
 
 

const PrivacyPolicy: React.FC = () => {
  const { user } = useAuthStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const displayName = ((user?.user_metadata as { first_name?: string })?.first_name) || user?.email?.split('@')[0]

  return (
    <div className="bg-gray-100 min-h-screen">
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
                <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-700 dark:text-gray-300">
                      Welcome, {displayName}
                    </span>
                    <a
                      href="/"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <Home className="w-4 h-4 inline mr-1" />
                      Home
                    </a>
                    <a
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <LayoutDashboard className="w-4 h-4 inline mr-1" />
                      Dashboard
                    </a>
                    <a
                      href="/settings"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <Settings className="w-4 h-4 inline mr-1" />
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
              <button
                className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70"
                onClick={() => setMobileNavOpen((o) => !o)}
                aria-label="Menu"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="md:hidden" id="mobile-nav-menu">
            <div className="container mx-auto px-4 pb-4">
              <div className="rounded-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="p-3">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Welcome, {displayName}</span>
                      </div>
                      <a href="/" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><Home className="w-4 h-4" /> Home</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a href="/dashboard" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a href="/settings" className="flex items-center justify-between px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <div className="border-t border-gray-200 dark:border-gray-800" />
                      <LogoutButton className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => { window.location.href = '/auth?mode=login' }}
                        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition text-left"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => { window.location.href = '/auth?mode=register' }}
                        className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-md"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
};

export default PrivacyPolicy;
