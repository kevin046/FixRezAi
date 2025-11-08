import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal, Star, Sparkles, FileText, Download, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import rbcLogo from "@/assets/logos/rbc.svg";
import bmoLogo from "@/assets/logos/bmo.svg";
import scotiabankLogo from "@/assets/logos/scotiabank.svg";
import cibcLogo from "@/assets/logos/cibc.svg";
import tdLogo from "@/assets/logos/td.svg";
import appleLogo from "@/assets/logos/apple.svg";
import nvidiaLogo from "@/assets/logos/nvidia.svg";
import teslaLogo from "@/assets/logos/tesla.svg";
import metaLogo from "@/assets/logos/meta.svg";
import googleLogo from "@/assets/logos/google.svg";
import anthropicLogo from "@/assets/logos/anthropic.svg";
import microsoftLogo from "@/assets/logos/microsoft.svg";
import LogoutButton from '@/components/LogoutButton'
import { ATSRating } from '@/components/ATSRating';
import { OptimizedResume } from '@/types/resume';

const logos = [
  { src: teslaLogo, alt: "Tesla" },
  { src: "https://cdn.prod.website-files.com/62775a91cc3db44c787149de/6850909680df25920b7334de_amazon_logo.svg", alt: "Amazon" },
  { src: appleLogo, alt: "Apple" },
  { src: metaLogo, alt: "META" },
  { src: googleLogo, alt: "Google" },
  { src: rbcLogo, alt: "RBC" },
  { src: bmoLogo, alt: "BMO" },
  { src: scotiabankLogo, alt: "Scotiabank" },
  { src: cibcLogo, alt: "CIBC" },
  { src: tdLogo, alt: "TD" },
  { src: nvidiaLogo, alt: "Nvidia" },
  { src: anthropicLogo, alt: "Anthropic" },
  { src: "https://cdn.prod.website-files.com/62775a91cc3db44c787149de/685090de68bf192b28747b4b_openai-logo.svg", alt: "OpenAI" },
  { src: "https://cdn.prod.website-files.com/62775a91cc3db44c787149de/685090ed6d096673303345d3_notion-logo.svg", alt: "Notion" },
  { src: microsoftLogo, alt: "Microsoft" },
];

import { User } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'
import { isVerified } from '@/lib/auth'
import VerificationIndicator from '@/components/VerificationIndicator'
import { useResumeStore } from '@/stores/resumeStore'

interface HeroProps {
  onGetStarted: () => void
  user: User | null
  onLogout: () => void
}

export const Hero = ({ onGetStarted, user, onLogout }: HeroProps) => {
  const [resumesProcessed, setResumesProcessed] = useState(0)
  const [logoutStatus, setLogoutStatus] = useState<'success' | 'error' | null>(null)
  const [showATSRating, setShowATSRating] = useState(false);
  const optimizedResume = useResumeStore((s) => s.optimizedResume)
  const verified = user ? isVerified(user) : false

  useEffect(() => {
    const getInitialCount = () => {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const now = new Date()
      const diffMs = now.getTime() - startOfDay.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      // Start with a base and add a random-like increment based on seconds passed today
      return 11240 + Math.floor(diffSeconds / 8) // Increment roughly every 8 seconds
    }

    setResumesProcessed(getInitialCount())

    const interval = setInterval(() => {
      setResumesProcessed(prevCount => prevCount + 1)
    }, 8000) // Increment every 8 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const isSuccess = params.get('logout') === '1'
      const isError = params.get('logout_error') === '1'
      if (isSuccess) {
        setLogoutStatus('success')
      } else if (isError) {
        setLogoutStatus('error')
      } else {
        setLogoutStatus(null)
      }

      if (isSuccess || isError) {
        const t = setTimeout(() => {
          setLogoutStatus(null)
          const cleanUrl = window.location.pathname
          window.history.replaceState({}, '', cleanUrl)
        }, 4000)
        return () => clearTimeout(t)
      }
    } catch {
      // noop
    }
  }, [])

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {logoutStatus && (
        <div className={`w-full text-center py-2 ${logoutStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {logoutStatus === 'success' ? 'You have been signed out successfully.' : 'Logout failed. Please try again.'}
        </div>
      )}
      {/* Navigation Bar */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FixRez AI
            </a>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700 dark:text-gray-300">
                    Welcome, {user.email?.split('@')[0]}
                  </span>
                  {/* Verification badge */}
                  <VerificationIndicator size="sm" />
                  <a
                    href="/dashboard"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    Dashboard
                  </a>
                  <LogoutButton
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  />
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

      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Resume Optimization
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight text-center">
            FixRez AI: Optimize Your Resume with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Magic
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed text-center">
            FixRez AI uses advanced AI to tailor your resume for any job description. 
            Get past ATS systems and land more interviews with personalized optimization.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16 w-full">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition inline-flex items-center justify-center"
            >
              Start Optimizing
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <button 
              onClick={() => {
                if (user) {
                  setShowATSRating(true)
                } else {
                  window.location.href = '/auth?mode=login'
                }
              }}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-blue-600 bg-white border-2 border-blue-600 rounded-full hover:bg-blue-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition inline-flex items-center justify-center"
            >
              ATS Rating
              <Medal className="w-4 h-4 ml-2" />
            </button>
          </div>
          
          {/* ATS Rating Modal */}
          {showATSRating && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ATS Rating</h2>
                    <button
                      onClick={() => setShowATSRating(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                  <ATSRating resume={optimizedResume} />
                </div>
              </div>
            </div>
          )}
          
          {/* Live Counter */}
          <div className="text-center mb-16">
            <p className="text-lg text-gray-600 dark:text-gray-300">Join over <span className="font-bold text-gray-900 dark:text-white">{resumesProcessed.toLocaleString()}</span> resumes optimized today!</p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Smart Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI analyzes job descriptions and optimizes your resume content for maximum ATS compatibility and recruiter appeal.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                5-Step Process
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Simple wizard guides you through job description input, resume upload, AI processing, preview, and export.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Download className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Multiple Formats
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Export your optimized resume as PDF or JSON-LD for LinkedIn and other platforms.
              </p>
            </div>
          </div>

          {/* Trusted by Section */}
          <div className="mt-24 w-full">
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8">Trusted by members hired at...</p>
            <div className="relative w-full overflow-hidden">
              <div className="flex animate-scroll">
                {[...logos, ...logos].map((logo, index) => (
                  <img key={index} src={logo.src} alt={logo.alt} className="h-6 sm:h-8 object-contain mx-6 md:mx-12 flex-shrink-0" />
                ))}
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">What Our Users Say</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">"A Game Changer!"</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 italic">"FixRez helped me get past the ATS and land my dream job at Google. The AI optimization is incredible."</p>
                  <p className="font-semibold text-right text-gray-700 dark:text-gray-400">- Sarah L.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">"Finally, a tool that works!"</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 italic">"I was skeptical at first, but after using FixRez, I got 3x more interviews. Highly recommended!"</p>
                  <p className="font-semibold text-right text-gray-700 dark:text-gray-400">- Michael B.</p>
                </CardContent>
              </Card>
              <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-center mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">"Invaluable for career changers"</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 italic">"As someone switching careers, FixRez was essential in tailoring my resume and highlighting my transferable skills."</p>
                  <p className="font-semibold text-right text-gray-700 dark:text-gray-400">- Emily C.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
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
  )
}









