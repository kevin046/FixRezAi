import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PieChart, BarChart2, Search, Home, Target, CheckCircle, XCircle, Twitter, Instagram, Facebook, Linkedin, Menu, X, LayoutDashboard, ChevronRight, Settings } from 'lucide-react'
import { getOptimizationHistory, getSupabaseOptimizationHistory, type OptimizationEvent } from '@/lib/analytics'
import { getExportStats, getSupabaseExportStats } from '@/lib/analytics'
import LogoutButton from '@/components/LogoutButton'
import { useAuthStore } from '@/stores/authStore'
import { isVerified } from '@/lib/auth'
import { useResumeStore } from '@/stores/resumeStore'
import { calculateATSScore, ATSScore } from '@/lib/atsScoring'
import UnverifiedUserNotification from '@/components/UnverifiedUserNotification'
import VerificationGate from '@/components/VerificationGate'
import VerificationStatusBadge from '@/components/VerificationStatusBadge'
 

export default function DashboardPage() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all')
  const [history, setHistory] = useState<OptimizationEvent[]>([])
  const [exportStats, setExportStats] = useState<{ total: number; counts: Record<string, number> }>({ total: 0, counts: {} })
  const { user } = useAuthStore()
  const verified = user ? isVerified(user) : false
  const optimizedResume = useResumeStore((s) => s.optimizedResume)
  const [atsScore, setATSScore] = useState<ATSScore | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const loadHistory = async () => {
      // Get local history first for immediate display
      const localHistory = getOptimizationHistory()
      setHistory(localHistory)
      
      // Then fetch from Supabase to supplement local data
      try {
        const supabaseHistory = await getSupabaseOptimizationHistory()
        if (supabaseHistory.length > 0) {
          // Merge local and Supabase data, keeping local data as primary
          const mergedHistory = [...localHistory]
          supabaseHistory.forEach(supabaseItem => {
            // Only add Supabase items that don't exist locally
            if (!mergedHistory.some(localItem => localItem.ts === supabaseItem.ts)) {
              mergedHistory.push(supabaseItem)
            }
          })
          // Sort by timestamp descending and limit to 100 items
          mergedHistory.sort((a, b) => b.ts - a.ts)
          const limitedHistory = mergedHistory.slice(0, 100)
          setHistory(limitedHistory)
          // Update localStorage with merged data
          localStorage.setItem('optimization_history', JSON.stringify(limitedHistory))
        }
      } catch (error) {
        console.warn('Failed to fetch Supabase optimization history:', error)
        // Keep using local data if Supabase fails
      }
    }
    
    const loadExportStats = async () => {
      // Get local stats first
      const localStats = getExportStats()
      setExportStats(localStats)
      
      // Then fetch from Supabase to supplement
      try {
        const supabaseStats = await getSupabaseExportStats()
        // Use whichever has more data (local or Supabase)
        if (supabaseStats.total > localStats.total) {
          setExportStats(supabaseStats)
          // Update localStorage with Supabase data
          localStorage.setItem('export_stats', JSON.stringify(supabaseStats))
        }
      } catch (error) {
        console.warn('Failed to fetch Supabase export stats:', error)
        // Keep using local stats if Supabase fails
      }
    }
    
    loadHistory()
    loadExportStats()
  }, [])

  useEffect(() => {
    if (optimizedResume && history.length > 0) {
      try {
        const score = calculateATSScore(optimizedResume)
        setATSScore(score)
      } catch { setATSScore(null) }
    } else {
      setATSScore(null)
    }
  }, [optimizedResume, history.length])

  const filtered = useMemo(() => {
    return history.filter(h => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false
      if (query && !h.jobTitle.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [history, query, statusFilter])

  const exportFormats = ['pdf','text','json','linkedin']


  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  const navigateToWizard = () => {
    // Use global event so App can apply verification gating
    window.dispatchEvent(new Event('navigate-to-upload'))
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900">
      {/* Unverified User Notification */}
      {user && !verified && <UnverifiedUserNotification />}
      
      {/* Navigation Bar (from index) */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <a href="/" className="inline-flex items-center gap-2" aria-label="FixRez AI home">
                <img src="/fixrez-favicon-black.svg" alt="FixRez AI" className="h-12 w-20" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">FixRez AI</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-700 dark:text-gray-300">
                      Welcome, {(user.user_metadata as any)?.first_name ?? user.email?.split('@')[0]}
                    </span>
                    <a
                      href="/"
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition inline-flex items-center gap-1"
                    >
                      <Home className="w-4 h-4" /> Home
                    </a>
                    <a
                      href="/dashboard"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
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
                  <>
                    <button
                      onClick={() => { window.location.href = '/auth?mode=login' }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => { window.location.href = '/auth?mode=register' }}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    >
                      Register
                    </button>
                  </>
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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Dashboard</h1>
                <VerificationStatusBadge compact={true} />
              </div>
              <p className="text-gray-600 dark:text-gray-300">Track your optimizations, exports, and ATS performance</p>
            </div>
            <div className="flex gap-2">
              <VerificationGate featureName="Resume Optimization">
                <Button onClick={navigateToWizard} className="bg-gradient-to-r from-blue-600 to-purple-600">Optimize Resume</Button>
              </VerificationGate>
              <a href="/contact" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">Contact</a>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Search className="w-5 h-5 text-gray-500"/>
                <Input
                  placeholder="Filter by job title"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant={statusFilter==='all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>All</Button>
                <Button variant={statusFilter==='success' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('success')}>Success</Button>
                <Button variant={statusFilter==='error' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('error')}>Error</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><PieChart className="w-5 h-5"/> Export Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{exportStats.total}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Across formats</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><BarChart2 className="w-5 h-5"/> Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{history.length ? Math.round((history.filter(h=>h.status==='success').length / history.length) * 100) : 0}%</div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Optimizations completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Target className="w-5 h-5"/> ATS Score</CardTitle>
            </CardHeader>
            <CardContent>
              {atsScore ? (
                <div>
                  <div className="text-3xl font-bold">{atsScore.totalScore}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Parse {atsScore.categories.parseRate.score}% • Impact {atsScore.categories.quantifyingImpact.score}%</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300">No optimized resume yet. Run optimization to see ATS score.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Export Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {exportFormats.map(fmt => (
                <div key={fmt} className="p-4 rounded-lg border bg-white dark:bg-gray-800">
                  <div className="text-2xl font-bold">{exportStats.counts[fmt] || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">{fmt}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Optimization history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Optimization History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filtered.map((h, i) => (
                <div key={i} className="p-4 rounded-lg border bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{h.jobTitle}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{new Date(h.ts).toLocaleString()}</div>
                    </div>
                    <div className={`text-sm ${h.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{h.status}</div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-300">No history found for current filters.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      
    </div>
  )
}
