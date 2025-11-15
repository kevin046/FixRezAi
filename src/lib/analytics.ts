import { supabase } from './supabase'

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

export type OptimizationEvent = {
  id: string
  ts: number
  jobTitle: string
  status: 'success' | 'error'
  durationSec: number
  jobDescription?: string
  originalResumeText?: string
  optimizedResumeData?: any
  errorMessage?: string
  modelUsed?: string
}

export type ExportEvent = {
  id: string
  ts: number
  format: 'pdf' | 'text' | 'json' | 'linkedin'
  template?: string
  optimizationId?: string
  filename?: string
  fileSizeBytes?: number
  exportDataHash?: string
  ipAddress?: string
  userAgent?: string
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

export async function logOptimization(e: OptimizationEvent) {
  // Store in localStorage for immediate access
  const list = getStore<OptimizationEvent[]>('optimization_history', [])
  list.unshift(e)
  setStore('optimization_history', list.slice(0, 100))
  
  // Store in Supabase for persistent tracking (metadata only, no resume content)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const optimizationData = {
        user_id: user.id,
        job_title: e.jobTitle,
        job_description: '', // Don't store job description for privacy
        original_resume_text: '', // Don't store resume content for privacy
        optimized_resume_data: null, // Don't store optimized resume data for privacy
        status: e.status,
        duration_seconds: e.durationSec,
        error_message: e.errorMessage ? 'Optimization failed' : null, // Generic error message only
        model_used: e.modelUsed || null,
        optimization_timestamp: new Date(e.ts).toISOString()
      }
      
      console.log('📊 Logging optimization to Supabase:', { 
        jobTitle: e.jobTitle, 
        status: e.status, 
        duration: e.durationSec 
      })
      
      const { error } = await supabase.from('optimization_history').insert(optimizationData)
      
      if (error) {
        console.error('❌ Failed to log optimization to Supabase:', error)
        console.error('Data attempted:', optimizationData)
      } else {
        console.log('✅ Optimization logged to Supabase successfully')
      }
    } else {
      console.log('⚠️ User not authenticated, skipping Supabase logging')
    }
  } catch (error) {
    console.error('💥 Error logging optimization to Supabase:', error)
  }
  
  // Google Analytics tracking
  const g = (window as any).gtag
  if (import.meta.env.PROD && typeof g === 'function') {
    g('event', 'optimization', { status: e.status, job_title: e.jobTitle, duration_sec: e.durationSec })
  }
}

export function getOptimizationHistory(): OptimizationEvent[] {
  return getStore<OptimizationEvent[]>('optimization_history', [])
}

export async function logExport(e: ExportEvent) {
  // Store in localStorage for immediate access
  const stats = getStore<{ total: number; counts: Record<string, number> }>('export_stats', { total: 0, counts: {} })
  stats.total += 1
  stats.counts[e.format] = (stats.counts[e.format] || 0) + 1
  setStore('export_stats', stats)
  
  // Store in Supabase for persistent tracking
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('export_history').insert({
        user_id: user.id,
        optimization_id: e.optimizationId,
        format: e.format,
        template: e.template,
        filename: e.filename,
        file_size_bytes: e.fileSizeBytes,
        export_data_hash: e.exportDataHash,
        ip_address: e.ipAddress,
        user_agent: e.userAgent,
        export_timestamp: new Date(e.ts).toISOString()
      }).select()
      
      if (error) {
        console.warn('Failed to log export to Supabase:', error)
      } else if (data && data.length > 0) {
        console.log('✅ Export logged to Supabase successfully with ID:', data[0].id)
        return data[0].id // Return the export ID for potential format storage
      }
    }
  } catch (error) {
    console.warn('Error logging export to Supabase:', error)
  }
  
  // Google Analytics tracking
  const g = (window as any).gtag
  if (import.meta.env.PROD && typeof g === 'function') {
    g('event', 'export', { format: e.format, template: e.template || 'default' })
  }
  
  return null
}

export function getExportStats(): { total: number; counts: Record<string, number> } {
  return getStore('export_stats', { total: 0, counts: {} })
}

export async function getSupabaseExportStats(): Promise<{ total: number; counts: Record<string, number> }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { total: 0, counts: {} }
    
    const { data, error } = await supabase
      .from('export_history')
      .select('format')
      .eq('user_id', user.id)
    
    if (error) {
      console.warn('Failed to fetch export stats from Supabase:', error)
      return { total: 0, counts: {} }
    }
    
    const counts: Record<string, number> = {}
    data.forEach(record => {
      counts[record.format] = (counts[record.format] || 0) + 1
    })
    
    return {
      total: data.length,
      counts
    }
  } catch (error) {
    console.warn('Error fetching export stats from Supabase:', error)
    return { total: 0, counts: {} }
  }
}

// New Supabase-based functions for persistent tracking
export async function getSupabaseOptimizationHistory(limit: number = 50): Promise<OptimizationEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    
    const { data, error } = await supabase
      .from('optimization_history')
      .select('*')
      .eq('user_id', user.id)
      .order('optimization_timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.warn('Failed to fetch optimization history from Supabase:', error)
      return []
    }
    
    return data.map(record => ({
      id: record.id,
      ts: new Date(record.optimization_timestamp).getTime(),
      jobTitle: record.job_title,
      status: record.status,
      durationSec: record.duration_seconds,
      jobDescription: record.job_description,
      originalResumeText: record.original_resume_text,
      optimizedResumeData: record.optimized_resume_data,
      errorMessage: record.error_message,
      modelUsed: record.model_used
    }))
  } catch (error) {
    console.warn('Error fetching optimization history from Supabase:', error)
    return []
  }
}

export async function getSupabaseExportHistory(limit: number = 50): Promise<ExportEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    
    const { data, error } = await supabase
      .from('export_history')
      .select('*')
      .eq('user_id', user.id)
      .order('export_timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.warn('Failed to fetch export history from Supabase:', error)
      return []
    }
    
    return data.map(record => ({
      id: record.id,
      ts: new Date(record.export_timestamp).getTime(),
      format: record.format,
      template: record.template,
      optimizationId: record.optimization_id,
      filename: record.filename,
      fileSizeBytes: record.file_size_bytes,
      exportDataHash: record.export_data_hash,
      ipAddress: record.ip_address,
      userAgent: record.user_agent
    }))
  } catch (error) {
    console.warn('Error fetching export history from Supabase:', error)
    return []
  }
}

export async function storeExportFormat(exportId: string, formatType: string, content: string, metadata?: any): Promise<void> {
  try {
    const { error } = await supabase.from('export_formats').insert({
      export_id: exportId,
      format_type: formatType,
      content: '', // Don't store actual content for privacy
      metadata: metadata || {}
    })
    
    if (error) {
      console.warn('Failed to store export format in Supabase:', error)
    } else {
      console.log('✅ Export format tracked in Supabase successfully')
    }
  } catch (error) {
    console.warn('Error storing export format in Supabase:', error)
  }
}
