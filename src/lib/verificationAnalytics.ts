import { supabase } from '@/lib/supabase'

export interface VerificationAnalytics {
  totalVerifications: number
  successfulVerifications: number
  failedVerifications: number
  verificationRate: number
  averageTimeToVerification: number
  resendAttempts: number
  rateLimitHits: number
  expiredTokens: number
  invalidTokens: number
  timeRange: {
    start: Date
    end: Date
  }
}

export interface SecurityEvent {
  id: string
  userId: string
  eventType: 'verification_sent' | 'verification_completed' | 'verification_failed' | 'rate_limit_exceeded' | 'token_expired' | 'invalid_token'
  email: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  metadata: Record<string, any>
  riskScore: number
  actionTaken: string
}

export interface VerificationMetrics {
  dailyStats: {
    date: string
    sent: number
    completed: number
    failed: number
    rate: number
  }[]
  hourlyStats: {
    hour: number
    sent: number
    completed: number
    failed: number
  }[]
  topEmailDomains: {
    domain: string
    count: number
    successRate: number
  }[]
  deviceBreakdown: {
    device: string
    count: number
    successRate: number
  }[]
}

/**
 * Log security events for verification system
 */
export async function logSecurityEvent(
  eventType: SecurityEvent['eventType'],
  userId: string,
  email: string,
  metadata: Record<string, any> = {},
  riskScore: number = 0
): Promise<void> {
  try {
    const ipAddress = await getClientIPAddress()
    const userAgent = navigator.userAgent
    
    const securityEvent: Omit<SecurityEvent, 'id' | 'timestamp'> = {
      userId,
      eventType,
      email,
      ipAddress,
      userAgent,
      metadata: {
        ...metadata,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      },
      riskScore,
      actionTaken: determineActionTaken(eventType, riskScore),
    }

    // Log to Supabase security_events table
    const { error } = await supabase
      .from('security_events')
      .insert({
        user_id: securityEvent.userId,
        event_type: securityEvent.eventType,
        email: securityEvent.email,
        ip_address: securityEvent.ipAddress,
        user_agent: securityEvent.userAgent,
        metadata: securityEvent.metadata,
        risk_score: securityEvent.riskScore,
        action_taken: securityEvent.actionTaken,
      })

    if (error) {
      console.error('Failed to log security event:', error)
    }

    // Also log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', securityEvent)
    }
  } catch (error) {
    console.error('Error logging security event:', error)
  }
}

/**
 * Get verification analytics for a specific time range
 */
export async function getVerificationAnalytics(
  startDate: Date,
  endDate: Date
): Promise<VerificationAnalytics> {
  try {
    // Get verification data from database
    const { data: verificationData, error: verificationError } = await supabase
      .from('verification_tokens')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (verificationError) {
      throw new Error(`Failed to fetch verification data: ${verificationError.message}`)
    }

    // Get security events for the time range
    const { data: securityEvents, error: eventsError } = await supabase
      .from('security_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('event_type', ['verification_sent', 'verification_completed', 'verification_failed'])

    if (eventsError) {
      throw new Error(`Failed to fetch security events: ${eventsError.message}`)
    }

    // Calculate metrics
    const totalVerifications = verificationData?.length || 0
    const successfulVerifications = verificationData?.filter(v => v.used_at && !v.expired_at).length || 0
    const failedVerifications = securityEvents?.filter(e => e.event_type === 'verification_failed').length || 0
    const verificationRate = totalVerifications > 0 ? (successfulVerifications / totalVerifications) * 100 : 0

    // Calculate average time to verification
    const completedVerifications = verificationData?.filter(v => v.used_at && v.created_at) || []
    const averageTimeToVerification = completedVerifications.length > 0
      ? completedVerifications.reduce((acc, v) => {
          const createdAt = new Date(v.created_at).getTime()
          const usedAt = new Date(v.used_at).getTime()
          return acc + (usedAt - createdAt)
        }, 0) / completedVerifications.length / (1000 * 60) // Convert to minutes
      : 0

    // Get resend attempts and rate limit hits
    const resendAttempts = securityEvents?.filter(e => e.event_type === 'verification_sent').length || 0
    const rateLimitHits = securityEvents?.filter(e => e.event_type === 'rate_limit_exceeded').length || 0

    // Get expired and invalid tokens
    const expiredTokens = verificationData?.filter(v => v.expired_at && !v.used_at).length || 0
    const invalidTokens = securityEvents?.filter(e => e.event_type === 'invalid_token').length || 0

    return {
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      verificationRate,
      averageTimeToVerification,
      resendAttempts,
      rateLimitHits,
      expiredTokens,
      invalidTokens,
      timeRange: { start: startDate, end: endDate },
    }
  } catch (error) {
    console.error('Error getting verification analytics:', error)
    throw error
  }
}

/**
 * Get detailed verification metrics
 */
export async function getVerificationMetrics(): Promise<VerificationMetrics> {
  try {
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get daily stats for last 30 days
    const { data: dailyData, error: dailyError } = await supabase
      .from('security_events')
      .select('*')
      .gte('created_at', last30Days.toISOString())
      .in('event_type', ['verification_sent', 'verification_completed', 'verification_failed'])

    if (dailyError) {
      throw new Error(`Failed to fetch daily metrics: ${dailyError.message}`)
    }

    // Process daily stats
    const dailyStatsMap = new Map<string, { sent: number; completed: number; failed: number }>()
    
    dailyData?.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0]
      const existing = dailyStatsMap.get(date) || { sent: 0, completed: 0, failed: 0 }
      
      if (event.event_type === 'verification_sent') existing.sent++
      if (event.event_type === 'verification_completed') existing.completed++
      if (event.event_type === 'verification_failed') existing.failed++
      
      dailyStatsMap.set(date, existing)
    })

    const dailyStats = Array.from(dailyStatsMap.entries()).map(([date, stats]) => ({
      date,
      ...stats,
      rate: stats.sent > 0 ? (stats.completed / stats.sent) * 100 : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Get hourly stats for last 24 hours
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const { data: hourlyData, error: hourlyError } = await supabase
      .from('security_events')
      .select('*')
      .gte('created_at', last24Hours.toISOString())
      .in('event_type', ['verification_sent', 'verification_completed', 'verification_failed'])

    if (hourlyError) {
      throw new Error(`Failed to fetch hourly metrics: ${hourlyError.message}`)
    }

    // Process hourly stats
    const hourlyStatsMap = new Map<number, { sent: number; completed: number; failed: number }>()
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyStatsMap.set(hour, { sent: 0, completed: 0, failed: 0 })
    }
    
    hourlyData?.forEach(event => {
      const hour = new Date(event.created_at).getHours()
      const existing = hourlyStatsMap.get(hour) || { sent: 0, completed: 0, failed: 0 }
      
      if (event.event_type === 'verification_sent') existing.sent++
      if (event.event_type === 'verification_completed') existing.completed++
      if (event.event_type === 'verification_failed') existing.failed++
      
      hourlyStatsMap.set(hour, existing)
    })

    const hourlyStats = Array.from(hourlyStatsMap.entries()).map(([hour, stats]) => ({
      hour,
      ...stats,
    }))

    // Get email domain breakdown
    const { data: domainData, error: domainError } = await supabase
      .from('security_events')
      .select('email, event_type')
      .gte('created_at', last30Days.toISOString())
      .in('event_type', ['verification_sent', 'verification_completed'])

    if (domainError) {
      throw new Error(`Failed to fetch domain metrics: ${domainError.message}`)
    }

    const domainStats = new Map<string, { sent: number; completed: number }>()
    
    domainData?.forEach(event => {
      const domain = event.email.split('@')[1] || 'unknown'
      const existing = domainStats.get(domain) || { sent: 0, completed: 0 }
      
      if (event.event_type === 'verification_sent') existing.sent++
      if (event.event_type === 'verification_completed') existing.completed++
      
      domainStats.set(domain, existing)
    })

    const topEmailDomains = Array.from(domainStats.entries())
      .map(([domain, stats]) => ({
        domain,
        count: stats.sent,
        successRate: stats.sent > 0 ? (stats.completed / stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get device breakdown from user agents
    const { data: deviceData, error: deviceError } = await supabase
      .from('security_events')
      .select('user_agent, event_type')
      .gte('created_at', last30Days.toISOString())
      .in('event_type', ['verification_sent', 'verification_completed'])

    if (deviceError) {
      throw new Error(`Failed to fetch device metrics: ${deviceError.message}`)
    }

    const deviceStats = new Map<string, { sent: number; completed: number }>()
    
    deviceData?.forEach(event => {
      const device = parseUserAgent(event.user_agent)
      const existing = deviceStats.get(device) || { sent: 0, completed: 0 }
      
      if (event.event_type === 'verification_sent') existing.sent++
      if (event.event_type === 'verification_completed') existing.completed++
      
      deviceStats.set(device, existing)
    })

    const deviceBreakdown = Array.from(deviceStats.entries())
      .map(([device, stats]) => ({
        device,
        count: stats.sent,
        successRate: stats.sent > 0 ? (stats.completed / stats.sent) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      dailyStats,
      hourlyStats,
      topEmailDomains,
      deviceBreakdown,
    }
  } catch (error) {
    console.error('Error getting verification metrics:', error)
    throw error
  }
}

/**
 * Generate risk score based on verification patterns
 */
export function calculateRiskScore(
  email: string,
  ipAddress: string,
  recentAttempts: number,
  timeSinceLastAttempt: number
): number {
  let riskScore = 0

  // Rate limiting risk
  if (recentAttempts > 3) riskScore += 30
  if (recentAttempts > 5) riskScore += 20

  // Time-based risk
  if (timeSinceLastAttempt < 60000) riskScore += 15 // Less than 1 minute
  if (timeSinceLastAttempt < 300000) riskScore += 10 // Less than 5 minutes

  // Email domain risk (example: temporary email services)
  const riskyDomains = ['tempmail', '10minutemail', 'mailinator', 'guerrillamail']
  const emailDomain = email.split('@')[1]?.toLowerCase() || ''
  if (riskyDomains.some(domain => emailDomain.includes(domain))) {
    riskScore += 25
  }

  // IP-based risk (simplified - in production, use proper IP geolocation)
  if (ipAddress === 'unknown' || ipAddress.includes('proxy')) {
    riskScore += 10
  }

  return Math.min(riskScore, 100) // Cap at 100
}

/**
 * Helper function to get client IP address
 */
async function getClientIPAddress(): Promise<string> {
  try {
    // In a real application, you'd use a service or your backend to get the IP
    // For now, return a placeholder
    return 'unknown'
  } catch (error) {
    console.error('Error getting IP address:', error)
    return 'unknown'
  }
}

/**
 * Determine action based on event type and risk score
 */
function determineActionTaken(eventType: SecurityEvent['eventType'], riskScore: number): string {
  if (riskScore >= 70) {
    return 'BLOCKED_HIGH_RISK'
  }
  
  if (riskScore >= 50) {
    return 'ADDITIONAL_VERIFICATION_REQUIRED'
  }
  
  switch (eventType) {
    case 'rate_limit_exceeded':
      return 'RATE_LIMITED'
    case 'invalid_token':
      return 'TOKEN_INVALIDATED'
    case 'token_expired':
      return 'TOKEN_EXPIRED'
    default:
      return 'ALLOWED'
  }
}

/**
 * Parse user agent to determine device type
 */
function parseUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  
  if (ua.includes('mobile')) return 'Mobile'
  if (ua.includes('tablet')) return 'Tablet'
  if (ua.includes('bot') || ua.includes('crawler')) return 'Bot'
  if (ua.includes('chrome') || ua.includes('firefox') || ua.includes('safari')) return 'Desktop'
  
  return 'Unknown'
}

export default {
  logSecurityEvent,
  getVerificationAnalytics,
  getVerificationMetrics,
  calculateRiskScore,
}