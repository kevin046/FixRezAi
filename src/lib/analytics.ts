export function initAnalytics() {
  const isProd = import.meta.env.PROD
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-3RFGG9GCS4'

  if (!isProd) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  ;(window as any).dataLayer = (window as any).dataLayer || []
  function gtag(...args: any[]) {
    ;(window as any).dataLayer.push(args)
  }
  ;(window as any).gtag = gtag

  gtag('js', new Date())
  gtag('config', measurementId, { send_page_view: true, anonymize_ip: true })
}

type OptimizationEvent = {
  id: string
  ts: number
  jobTitle: string
  status: 'success' | 'error'
  durationSec: number
}

type ExportEvent = {
  id: string
  ts: number
  format: 'pdf' | 'text' | 'json' | 'linkedin'
  template?: string
}

function getStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function setStore(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function logOptimization(e: OptimizationEvent) {
  const list = getStore<OptimizationEvent[]>('optimization_history', [])
  list.unshift(e)
  setStore('optimization_history', list.slice(0, 100))
  const g = (window as any).gtag
  if (import.meta.env.PROD && typeof g === 'function') {
    g('event', 'optimization', { status: e.status, job_title: e.jobTitle, duration_sec: e.durationSec })
  }
}

export function getOptimizationHistory(): OptimizationEvent[] {
  return getStore<OptimizationEvent[]>('optimization_history', [])
}

export function logExport(e: ExportEvent) {
  const stats = getStore<{ total: number; counts: Record<string, number> }>('export_stats', { total: 0, counts: {} })
  stats.total += 1
  stats.counts[e.format] = (stats.counts[e.format] || 0) + 1
  setStore('export_stats', stats)
  const g = (window as any).gtag
  if (import.meta.env.PROD && typeof g === 'function') {
    g('event', 'export', { format: e.format, template: e.template || 'default' })
  }
}

export function getExportStats(): { total: number; counts: Record<string, number> } {
  return getStore('export_stats', { total: 0, counts: {} })
}
