<<<<<<< HEAD
export default function Footer() {
  return (
    <footer className="py-10 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 Summit Pixels Inc.</p>
          <div className="flex items-center gap-6 text-sm">
            <a href="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Terms</a>
            <a href="/privacy" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Privacy</a>
            <a href="/contact" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Contact</a>
            <a href="/accessibility" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Accessibility</a>
            <a href="/settings#security" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Security</a>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-300">Powered by Summit Pixels Inc.</span>
=======
import { Link } from 'react-router-dom'
import { Facebook, Twitter, Instagram, Linkedin, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">FixRez AI</h3>
            <p className="text-gray-300 mb-4">
              Professional AI-powered resume optimization tool that helps job seekers 
              create ATS-friendly resumes and land more interviews.
            </p>
            <div className="flex space-x-4">
              <a href="https://twitter.com/fixrezai" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-400 transition">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/fixrezai" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-600 transition">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://instagram.com/fixrezai" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-pink-400 transition">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://linkedin.com/company/fixrezai" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition">
                  Home - AI Resume Optimizer
                </a>
              </li>
              <li>
                <a href="/optimize" className="text-gray-300 hover:text-white transition">
                  Resume Optimization Tool
                </a>
              </li>
              <li>
                <a href="/auth?mode=register" className="text-gray-300 hover:text-white transition">
                  Create Free Account
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-300 hover:text-white transition">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-gray-300 hover:text-white transition">
                  User Dashboard
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="/blog/how-to-beat-ats-systems" className="text-gray-300 hover:text-white transition">
                  How to Beat ATS Systems
                </a>
              </li>
              <li>
                <a href="/blog/resume-writing-tips" className="text-gray-300 hover:text-white transition">
                  Professional Resume Writing Tips
                </a>
              </li>
              <li>
                <a href="/blog/ai-resume-optimization" className="text-gray-300 hover:text-white transition">
                  AI Resume Optimization Guide
                </a>
              </li>
              <li>
                <a href="/blog/job-search-strategies" className="text-gray-300 hover:text-white transition">
                  Job Search Strategies 2024
                </a>
              </li>
              <li>
                <a href="/blog/interview-preparation" className="text-gray-300 hover:text-white transition">
                  Interview Preparation Tips
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Support & Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="/help" className="text-gray-300 hover:text-white transition">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-300 hover:text-white transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-300 hover:text-white transition">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/verify" className="text-gray-300 hover:text-white transition">
                  Account Verification
                </a>
              </li>
              <li>
                <a href="/settings" className="text-gray-300 hover:text-white transition">
                  Account Settings
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm">
              © 2024 FixRez AI. All rights reserved. | AI Resume Optimization Tool
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/sitemap.xml" className="text-gray-300 hover:text-white text-sm transition">
                Sitemap
              </a>
              <a href="/accessibility" className="text-gray-300 hover:text-white text-sm transition">
                Accessibility
              </a>
              <a href="/security" className="text-gray-300 hover:text-white text-sm transition">
                Security
              </a>
            </div>
>>>>>>> 6ae1463aa0e5836c40e3f474f1cdc846c52f9e9d
          </div>
        </div>
      </div>
    </footer>
  )
<<<<<<< HEAD
}
=======
}
>>>>>>> 6ae1463aa0e5836c40e3f474f1cdc846c52f9e9d
