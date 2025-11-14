/**
 * Verification Middleware
 * Provides middleware for checking user verification status and handling verification requirements
 */

import VerificationService from '../services/verificationService.js';

const verificationService = new VerificationService();

/**
 * Middleware to require email verification for protected routes
 */
export function requireEmailVerification(req, res, next) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Get comprehensive verification status
      const result = await verificationService.getUserVerificationStatus(user.id);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to check verification status',
          code: 'VERIFICATION_CHECK_FAILED'
        });
      }

      const status = result.status;
      
      // Check if user is verified
      if (!status.is_verified) {
        return res.status(403).json({
          success: false,
          error: 'Email verification required',
          code: 'VERIFICATION_REQUIRED',
          details: {
            has_valid_token: status.has_valid_token,
            token_expires_at: status.token_expires_at,
            message: status.has_valid_token 
              ? 'Please check your email for verification link'
              : 'Please request a new verification email'
          }
        });
      }

      // Add verification info to request for downstream use
      req.verificationStatus = {
        isVerified: true,
        verifiedAt: status.verification_timestamp,
        verificationMethod: status.verification_method
      };

      next();
    } catch (error) {
      console.error('Verification middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware to check verification status without blocking
 */
export function checkVerificationStatus(req, res, next) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        req.verificationStatus = {
          isVerified: false,
          reason: 'Not authenticated'
        };
        return next();
      }

      const result = await verificationService.getUserVerificationStatus(user.id);
      
      if (!result.success) {
        req.verificationStatus = {
          isVerified: false,
          reason: 'Failed to check status',
          error: result.error
        };
        return next();
      }

      const status = result.status;
      req.verificationStatus = {
        isVerified: status.is_verified,
        verifiedAt: status.verification_timestamp,
        verificationMethod: status.verification_method,
        hasValidToken: status.has_valid_token,
        tokenExpiresAt: status.token_expires_at
      };

      next();
    } catch (error) {
      console.error('Check verification status error:', error);
      req.verificationStatus = {
        isVerified: false,
        reason: 'Internal error',
        error: error.message
      };
      next();
    }
  };
}

/**
 * Middleware to require specific verification level
 */
export function requireVerificationLevel(level = 'email') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const result = await verificationService.getUserVerificationStatus(user.id);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to check verification status',
          code: 'VERIFICATION_CHECK_FAILED'
        });
      }

      const status = result.status;

      switch (level) {
        case 'email':
          if (!status.is_verified) {
            return res.status(403).json({
              success: false,
              error: 'Email verification required',
              code: 'EMAIL_VERIFICATION_REQUIRED'
            });
          }
          break;

        case 'strict':
          if (!status.is_verified || status.verification_method !== 'email_token') {
            return res.status(403).json({
              success: false,
              error: 'Strict email token verification required',
              code: 'STRICT_VERIFICATION_REQUIRED'
            });
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid verification level',
            code: 'INVALID_VERIFICATION_LEVEL'
          });
      }

      req.verificationStatus = {
        isVerified: true,
        verifiedAt: status.verification_timestamp,
        verificationMethod: status.verification_method
      };

      next();
    } catch (error) {
      console.error('Require verification level error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware to handle unverified user redirects
 */
export function handleUnverifiedRedirect(redirectUrl = '/verify') {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.redirect('/auth?mode=login');
      }

      const result = await verificationService.getUserVerificationStatus(user.id);
      
      if (!result.success) {
        return res.redirect(redirectUrl + '?error=status_check_failed');
      }

      const status = result.status;
      
      if (!status.is_verified) {
        // Add query parameters for better UX
        const params = new URLSearchParams();
        if (status.has_valid_token) {
          params.set('has_token', 'true');
          params.set('expires_at', status.token_expires_at);
        } else {
          params.set('needs_token', 'true');
        }
        
        return res.redirect(redirectUrl + '?' + params.toString());
      }

      next();
    } catch (error) {
      console.error('Handle unverified redirect error:', error);
      return res.redirect(redirectUrl + '?error=internal');
    }
  };
}

/**
 * Middleware to log verification attempts
 */
export function logVerificationAttempt(req, res, next) {
  return async (req, res, next) => {
    const originalSend = res.send;
    const startTime = Date.now();
    
    res.send = function(data) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Log verification attempt
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        userId: req.user?.id || null,
        statusCode: res.statusCode,
        responseTime: responseTime,
        verificationStatus: req.verificationStatus || null
      };

      // Only log if this is a verification-related request
      if (req.url.includes('/verify') || req.url.includes('/verification')) {
        console.log('[VERIFICATION_ATTEMPT]', JSON.stringify(logEntry));
      }

      originalSend.call(this, data);
    };

    next();
  };
}

export default {
  requireEmailVerification,
  checkVerificationStatus,
  requireVerificationLevel,
  handleUnverifiedRedirect,
  logVerificationAttempt
};