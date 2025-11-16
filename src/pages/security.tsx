import React from "react";
import { useAuthStore } from '@/stores/authStore'
import { Home, LayoutDashboard, Settings, Shield, Lock, Key, Eye, AlertTriangle, CheckCircle, Twitter, Instagram, Facebook, Linkedin } from 'lucide-react'
import LogoutButton from '@/components/LogoutButton'
 
import { isVerified } from '@/lib/auth'

const SecurityPage: React.FC = () => {
  const { user } = useAuthStore()
  const verified = user ? isVerified(user) : false

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Enhanced Navigation - consistent with main pages */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FixRez AI
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Security at FixRez AI</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Your trust is our priority. We implement industry-leading security measures to protect your data and ensure your privacy.
          </p>
        </div>

        {/* Security Overview */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Data Protection</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              All data is encrypted in transit and at rest using AES-256 encryption. We implement secure key management and regular security audits.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> TLS 1.3 encryption for all connections</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> AES-256 encryption for data storage</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Regular security audits and penetration testing</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Key className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Authentication</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Multi-factor authentication and secure session management protect your account from unauthorized access.
            </p>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Multi-factor authentication support</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Secure session tokens with automatic expiration</li>
              <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Password strength requirements and hashing</li>
            </ul>
          </div>
        </div>

        {/* Detailed Security Features */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6">Security Features</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full mb-3">
                <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Monitoring</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                24/7 security monitoring with automated threat detection and response systems.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-3">
                <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Incident Response</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rapid incident response procedures with dedicated security team and clear communication protocols.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full mb-3">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Compliance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adherence to industry standards including GDPR, CCPA, and other privacy regulations.
              </p>
            </div>
          </div>
        </div>

        {/* Security Tips for Users */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-6">Security Tips</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Account Security</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Use a strong, unique password</li>
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Enable two-factor authentication</li>
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Review account activity regularly</li>
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Keep your email secure</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Safe Browsing</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Always check for HTTPS connection</li>
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Don't share login credentials</li>
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Be cautious of phishing attempts</li>
                <li className="flex items-start"><CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" /> Keep your browser updated</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Report Security Issue */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Report a Security Issue</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            If you discover a security vulnerability or have concerns about your account security, please contact us immediately.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Contact Security Team
          </a>
        </div>
      </div>


    </div>
  );
};

export default SecurityPage;
