export type ExportEvent = {
  id: string
  ts: number
  format: 'pdf' | 'text' | 'json' | 'linkedin'
  template?: 'modern' | 'classic' | 'executive'
}

export type OptimizationEvent = {
  id: string
  ts: number
  jobTitle: string
  status: 'success' | 'error'
  durationSec?: number
}

const KEY_EXPORTS = 'fixrez_exports'
const KEY_OPTIMIZE = 'fixrez_optimize_history'

export function logExport(evt: ExportEvent) {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_EXPORTS) : null
  const arr: ExportEvent[] = raw ? JSON.parse(raw) : []
  arr.push(evt)
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY_EXPORTS, JSON.stringify(arr))
}

export function logOptimization(evt: OptimizationEvent) {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_OPTIMIZE) : null
  const arr: OptimizationEvent[] = raw ? JSON.parse(raw) : []
  arr.push(evt)
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY_OPTIMIZE, JSON.stringify(arr))
}

export function getExportStats() {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_EXPORTS) : null
  const arr: ExportEvent[] = raw ? JSON.parse(raw) : []
  const counts = arr.reduce<Record<string, number>>((acc, e) => {
    acc[e.format] = (acc[e.format] || 0) + 1
    return acc
  }, {})
  return { total: arr.length, counts }
}

export function getOptimizationHistory() {
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY_OPTIMIZE) : null
  const arr: OptimizationEvent[] = raw ? JSON.parse(raw) : []
  // Newest first
  return arr.sort((a, b) => b.ts - a.ts)
}