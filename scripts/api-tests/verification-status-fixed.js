/**
 * Fixed Verification Status Endpoint
 * This fixes the issue where verified users see "Not verified" banner
 */

// Get enhanced verification status for current user - FIXED VERSION
app.get('/api/verification/status', ipAllowlist, rateLimiter, requireAuth, verificationMiddleware.logVerificationAttempt(), async (req, res) => {
  try {
    const user = req.user
    const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Check if user has email_confirmed_at from Supabase (basic verification)
    const isEmailVerified = Boolean(user.email_confirmed_at)
    
    // If dev bypass is enabled, return verified status
    if (DEV_AUTH_BYPASS) {
      return res.json({ 
        success: true, 
        status: { 
          is_verified: true, 
          verification_timestamp: new Date().toISOString(), 
          verification_method: 'dev_bypass', 
          verification_token_id: null, 
          has_valid_token: false, 
          token_expires_at: null 
        } 
      })
    }
    
    // If no service key, fall back to basic email verification
    if (!hasKey) {
      return res.json({ 
        success: true, 
        status: { 
          is_verified: isEmailVerified, 
          verification_timestamp: user.email_confirmed_at || null, 
          verification_method: isEmailVerified ? 'supabase_email' : null, 
          verification_token_id: null, 
          has_valid_token: false, 
          token_expires_at: null 
        } 
      })
    }
    
    // Try to use enhanced verification service
    try {
      const statusResult = await verificationServiceEnhanced.getUserVerificationStatus(user.id)
      if (statusResult.success) {
        return res.json({ success: true, status: statusResult.status })
      }
    } catch (enhancedError) {
      console.warn('Enhanced verification service failed, falling back to basic verification:', enhancedError.message)
    }
    
    // Fallback to basic email verification if enhanced service fails
    return res.json({ 
      success: true, 
      status: { 
        is_verified: isEmailVerified, 
        verification_timestamp: user.email_confirmed_at || null, 
        verification_method: isEmailVerified ? 'supabase_email' : null, 
        verification_token_id: null, 
        has_valid_token: false, 
        token_expires_at: null 
      } 
    })
  } catch (error) {
    console.error('Error getting verification status:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})