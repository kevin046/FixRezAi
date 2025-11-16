export function getApiBase(): string {
  try {
    const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
    const winBase = typeof window !== 'undefined' ? (window as any).__VITE_API_BASE_URL as string | undefined : undefined
    const selectedBase = envBase || winBase
    if (selectedBase && selectedBase.length > 0) {
      return selectedBase.replace(/\/$/, '')
    }
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      const isLocal = host === 'localhost' || host === '127.0.0.1'
      if (isLocal) return 'http://localhost:3003/api'
      return `${window.location.origin}/api`.replace(/\/$/, '')
    }
  } catch {}
  // For development environment, default to localhost
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return 'http://localhost:3003/api'
  }
  return '/api'
}
