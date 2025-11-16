import React from "react";
import { useAuthStore } from '@/stores/authStore'
import { Home, LayoutDashboard, Settings, Twitter, Instagram, Facebook, Linkedin } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
 
import { isVerified } from '@/lib/auth'

const TermsAndConditions: React.FC = () => {
  const { user } = useAuthStore()
  const verified = user ? isVerified(user) : false

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Navigation identical to index */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
                <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FixRez AI</span>
              </a>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700 dark:text-gray-300">
                    Welcome, {(user.user_metadata as any)?.first_name ?? user.email?.split('@')[0]}
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
          </div>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Terms and Conditions</h1>
        <p className="text-gray-600 mb-6">FixRez AI (fixrez.com) is owned and operated by Summit Pixels Inc.</p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <p className="text-gray-700 mb-4">
            Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the FixRez website (the "Service") operated by Summit Pixels Inc. ("us", "we", or "our").
          </p>
          <p className="text-gray-700 mb-4">
            Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
          </p>
          <p className="text-gray-700 mb-4">
            By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Accounts</h2>
          <p className="text-gray-700 mb-4">
            When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </p>
          <p className="text-gray-700 mb-4">
            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
          </p>
          <p className="text-gray-700 mb-4">
            You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Intellectual Property</h2>
          <p className="text-gray-700 mb-4">
            The Service and its original content, features, and functionality are and will remain the exclusive property of Summit Pixels Inc. and its licensors. The Service is protected by copyright, trademark, and other laws of Canada. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Summit Pixels Inc.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Links To Other Web Sites</h2>
          <p className="text-gray-700 mb-4">
            Our Service may contain links to third-party web sites or services that are not owned or controlled by Summit Pixels Inc.
          </p>
          <p className="text-gray-700 mb-4">
            Summit Pixels Inc. has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party web sites or services. You further acknowledge and agree that Summit Pixels Inc. shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the use of or reliance on any such content, goods or services available on or through any such web sites or services.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Termination</h2>
          <p className="text-gray-700 mb-4">
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
          <p className="text-gray-700 mb-4">
            Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Governing Law</h2>
          <p className="text-gray-700 mb-4">
            These Terms shall be governed and construed in accordance with the laws of Canada, without regard to its conflict of law provisions.
          </p>
          <p className="text-gray-700 mb-4">
            Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect. These Terms constitute the entire agreement between us regarding our Service, and supersede and replace any prior agreements we might have between us regarding the Service.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Changes</h2>
          <p className="text-gray-700 mb-4">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>
          <p className="text-gray-700 mb-4">
            By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-4">Contact Us</h2>
          <p className="text-gray-700">
            If you have any questions about these Terms, please contact us.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
