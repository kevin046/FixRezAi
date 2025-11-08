import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

function percent(n: number, d: number) {
  if (!d) return 0
  return Math.max(0, Math.min(100, Math.round((n / d) * 100)))
}

export default function AdminMetricsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const adminEmails = useMemo(() => (
    (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  ), [])

  const isAdmin = useMemo(() => {
    const email = (user?.email || '').toLowerCase()
    return !!email && adminEmails.includes(email)
  }, [user, adminEmails])

  useEffect(() => {
    let timer: number | undefined
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        setError(null)
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        const token = session?.access_token
        if (!token) {
          setError('Not authenticated')
          setLoading(false)
          return
        }
        const res = await fetch('/api/verification-metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json?.error || `Error ${res.status}`)
        } else {
          setMetrics(json?.metrics || json)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load metrics')
      } finally {
        setLoading(false)
        timer = window.setTimeout(fetchMetrics, 10_000) as unknown as number
      }
    }
    fetchMetrics()
    return () => { if (timer) window.clearTimeout(timer) }
  }, [])

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Metrics</h1>
        <p className="text-gray-600">Please sign in to view metrics.</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Admin Metrics</h1>
        <p className="text-red-600">Access denied. Admins only.</p>
      </div>
    )
  }

  const stats = metrics?.stats || {}
  const email = metrics?.email || {}
  const rate = metrics?.rateLimiter || {}
  const health = metrics?.health || {}

  const total = stats?.total_users ?? 0
  const verified = stats?.verified_users ?? 0
  const verificationRate = stats?.verification_rate ?? percent(verified, total)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Metrics</h1>
        <span className="text-sm text-gray-500">Auto-refreshing every 10s</span>
      </div>

      {loading && <div className="text-gray-600">Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Users Verified</div>
          <div className="text-3xl font-bold">{verified} / {total}</div>
          <div className="mt-2 h-2 bg-gray-200 rounded">
            <div className="h-2 bg-green-500 rounded" style={{ width: `${verificationRate}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">{verificationRate}%</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Email Provider</div>
          <div className="text-lg font-semibold">{email?.provider || 'resend'}</div>
          <div className="text-sm">Configured: {email?.configured ? 'Yes' : 'No'}</div>
          <div className="text-sm">From: {email?.from || 'n/a'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Rate Limiter</div>
          <div className="text-sm">Window: {rate?.window_ms} ms</div>
          <div className="text-sm">Max: {rate?.max}</div>
          <div className="text-sm">Active Buckets: {rate?.active_buckets}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">System Health</div>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Supabase configured: {health?.supabaseConfigured ? '✅' : '❌'}</li>
            <li>Email service configured: {health?.emailServiceConfigured ? '✅' : '❌'}</li>
            <li>Dev bypass: {health?.devBypass ? 'ON' : 'OFF'}</li>
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Raw Stats</div>
          <pre className="mt-2 text-xs overflow-auto bg-gray-100 dark:bg-gray-900 p-3 rounded">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}