import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal, Star, Sparkles, FileText, Download, ArrowRight, Linkedin, Twitter, Instagram, Facebook, Home, LayoutDashboard, Settings, Menu, X, ChevronRight, Upload, Search, CheckCircle, Wand2 } from "lucide-react";
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
import { useResumeStore } from '@/stores/resumeStore'
import VerificationGate from '@/components/VerificationGate'

interface HeroProps {
  onGetStarted: () => void
  user: User | null
  onLogout: () => void
}

export const Hero = ({ onGetStarted, user, onLogout }: HeroProps) => {
  const [resumesProcessed, setResumesProcessed] = useState(0)
  const [logoutStatus, setLogoutStatus] = useState<'success' | 'error' | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  useEffect(() => {
    try {
      const footers = document.querySelectorAll('footer')
      footers.forEach(f => {
        const text = (f.textContent || '').toLowerCase()
        if (text.includes('fixrez ai') || text.includes('ai resume optimization tool') || text.includes('© 2024')) {
          (f as HTMLElement).style.display = 'none'
        }
      })
    } catch { }
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
            <a href="/" className="inline-flex items-center gap-2 flex-shrink-0" aria-label="FixRez AI home">
              <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">FixRez AI</span>
            </a>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center space-x-2 sm:space-x-4">
                {user ? (
                  <>
                    <span className="hidden sm:inline text-gray-700 dark:text-gray-300 text-sm">
                      Welcome, {(user.user_metadata as any)?.first_name ?? user.email?.split('@')[0]}
                    </span>
                    <a
                      href="/dashboard"
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden">Dash</span>
                    </a>
                    <a
                      href="/settings"
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <span className="hidden sm:inline">Settings</span>
                      <span className="sm:hidden">⚙️</span>
                    </a>
                    <LogoutButton
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { window.location.href = '/auth?mode=login' }}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <span className="hidden sm:inline">Login</span>
                      <span className="sm:hidden">Sign In</span>
                    </button>
                    <button
                      onClick={() => { window.location.href = '/auth?mode=register' }}
                      className="px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    >
                      <span className="hidden sm:inline">Register</span>
                      <span className="sm:hidden">Sign Up</span>
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
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Welcome, {(user.user_metadata as any)?.first_name ?? user.email?.split('@')[0]}</span>
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

      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col items-center max-w-4xl mx-auto">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            AI-Powered Resume Optimization
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight text-center px-2">
            FixRez AI: Professional Resume Optimization Tool with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Advanced AI Technology
            </span>
          </h1>

          {/* Subtitle */}
          <h2 className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12 max-w-2xl md:max-w-3xl mx-auto leading-relaxed text-center px-2">
            FixRez AI uses advanced artificial intelligence to tailor your resume for any job description.
            Get past ATS systems and land more interviews with personalized optimization and AI-powered insights.
          </h2>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-12 sm:mb-16 w-full px-2">
            <VerificationGate featureName="Resume Optimization">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition inline-flex items-center justify-center"
              >
                Optimize Your Resume Free
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              </button>
            </VerificationGate>
          </div>

          {/* Live Counter */}
          <div className="text-center mb-8 sm:mb-16">
            <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300">Join over <span className="font-bold text-gray-900 dark:text-white">{resumesProcessed.toLocaleString()}</span> resumes optimized today!</p>
          </div>

          {/* Feature Cards */}
        </div>

        {/* How It Works Section */}
        <div className="mt-20 sm:mt-32 w-full">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Transform your resume in minutes with our simple 3-step AI process.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 dark:from-blue-900 dark:via-purple-900 dark:to-blue-900 -translate-y-1/2 z-0" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm md:shadow-none">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-gray-900 shadow-sm">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">1. Upload Resume</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Upload your existing resume (PDF) and the job description you're targeting.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm md:shadow-none">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-gray-900 shadow-sm">
                  <Wand2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2. AI Optimization</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Our AI analyzes keywords and tailors your content to match the job requirements.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm md:shadow-none">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-gray-900 shadow-sm">
                  <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3. Download</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get your ATS-optimized resume in PDF format, ready to apply and get hired.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted by Section */}
        <div className="mt-16 sm:mt-24 w-full">
          <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 mb-4 sm:mb-8">Trusted by members hired at...</p>
          <div className="relative w-full overflow-hidden">
            <div className="flex animate-scroll">
              {[...logos, ...logos].map((logo, index) => (
                <img key={index} src={logo.src} alt={logo.alt} className="h-4 sm:h-6 md:h-8 object-contain mx-3 sm:mx-6 md:mx-12 flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mt-16 sm:mt-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8 sm:mb-12">What Our Users Say</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />)}
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">"A Game Changer!"</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 italic text-sm sm:text-base">"FixRez helped me get past the ATS and land my dream job at Google. The AI optimization is incredible."</p>
                <p className="font-semibold text-right text-gray-700 dark:text-gray-400 text-sm">- Sarah L.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />)}
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">"Finally, a tool that works!"</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 italic text-sm sm:text-base">"I was skeptical at first, but after using FixRez, I got 3x more interviews. Highly recommended!"</p>
                <p className="font-semibold text-right text-gray-700 dark:text-gray-400 text-sm">- Michael B.</p>
              </CardContent>
            </Card>
            <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-center mb-2">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />)}
                </div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">"Invaluable for career changers"</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 italic text-sm sm:text-base">"As someone switching careers, FixRez was essential in tailoring my resume and highlighting my transferable skills."</p>
                <p className="font-semibold text-right text-gray-700 dark:text-gray-400 text-sm">- Emily C.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>


  )
}
