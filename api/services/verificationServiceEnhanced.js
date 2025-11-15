/**
 * Enhanced Verification Service with Database Functions
 * Uses new Supabase database functions for verification operations
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Get environment variables at runtime instead of module load time
function getSupabaseUrl() {
  return process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
}

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getVerificationJwtSecret() {
  const serviceKey = getSupabaseServiceRoleKey();
  return process.env.VERIFICATION_JWT_SECRET || (serviceKey ? crypto.createHash('sha256').update(String(serviceKey)).digest('hex') : crypto.randomBytes(32).toString('hex'));
}
const TOKEN_EXPIRY_HOURS = Number(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS || 24);

// Base64 URL encoding for JWT
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlJson(obj) {
  return base64url(JSON.stringify(obj));
}

// JWT signing and verification
function signJwtHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const part1 = base64urlJson(header);
  const part2 = base64urlJson(payload);
  const data = `${part1}.${part2}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

function verifyJwtHS256(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [p1, p2, sig] = parts;
  const data = `${p1}.${p2}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (sig !== expected) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(p2.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && nowSec > payload.exp) throw new Error('Token expired');
  return payload;
}

// Generate secure token hash
function generateTokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

class EnhancedVerificationService {
  constructor() {
    this.admin = null;
    this.initialized = false;
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    const serviceKey = getSupabaseServiceRoleKey();
    const supabaseUrl = getSupabaseUrl();
    
    if (!serviceKey) {
      console.log('EnhancedVerificationService: No SUPABASE_SERVICE_ROLE_KEY found, service will operate in bypass mode');
      this.admin = null;
      this.initialized = true;
      return;
    }
    
    try {
      this.admin = createClient(supabaseUrl, serviceKey);
      this.initialized = true;
      console.log('EnhancedVerificationService: Successfully initialized with Supabase');
    } catch (error) {
      console.error('EnhancedVerificationService: Failed to initialize Supabase client:', error);
      this.admin = null;
      this.initialized = true;
    }
  }

  /**
   * Create a verification token using the database function
   */
  async createVerificationToken(userId, type = 'email', method = 'email', expiresInMinutes = 60, ip = null, userAgent = null) {
    try {
      this.init();
      
      // Use the database function to create token
      const { data: tokenId, error } = await this.admin
        .rpc('create_verification_token', {
          p_user_id: userId,
          p_type: type,
          p_method: method,
          p_expires_in_minutes: expiresInMinutes
        });

      if (error) {
        throw new Error(`Failed to create verification token: ${error.message}`);
      }

      // Get the created token details
      const { data: tokenData, error: tokenError } = await this.admin
        .from('verification_tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      if (tokenError || !tokenData) {
        throw new Error('Failed to retrieve created token');
      }

      // Generate JWT token for the user
      const nowSec = Math.floor(Date.now() / 1000);
      const expirySec = nowSec + (expiresInMinutes * 60);
      
      const payload = {
        sub: userId,
        type: type,
        method: method,
        token_id: tokenId,
        iat: nowSec,
        exp: expirySec
      };

      const jwtToken = signJwtHS256(payload, VERIFICATION_JWT_SECRET);

      return {
        success: true,
        tokenId: tokenId,
        jwtToken: jwtToken,
        expiresAt: new Date(expirySec * 1000).toISOString(),
        tokenData: tokenData
      };
    } catch (error) {
      console.error('Create verification token error:', error);
      return {
        success: false,
        error: error.message,
        errorType: 'system_error'
      };
    }
  }

  /**
   * Verify a user token using the database function
   */
  async verifyUserToken(userId, token, method = 'email', ip = null, userAgent = null) {
    try {
      this.init();
      
      // Verify JWT first
      const payload = verifyJwtHS256(token, VERIFICATION_JWT_SECRET);
      
      if (payload.sub !== userId) {
        throw new Error('Token user ID mismatch');
      }

      // Use the database function to verify token
      const { data: result, error } = await this.admin
        .rpc('verify_user_token', {
          p_user_id: userId,
          p_token: token,
          p_method: method
        });

      if (error) {
        // Handle specific error types from database
        const errorType = this.mapDatabaseError(error.message);
        return {
          success: false,
          error: error.message,
          errorType: errorType,
          canRetry: this.canRetryError(errorType)
        };
      }

      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error || 'Verification failed',
          errorType: result?.error_type || 'system_error',
          canRetry: this.canRetryError(result?.error_type)
        };
      }

      return {
        success: true,
        userId: userId,
        verifiedAt: result.verification_timestamp,
        method: result.verification_method,
        tokenId: result.verification_token_id
      };
    } catch (error) {
      console.error('Verify user token error:', error);
      
      let errorType = 'system_error';
      let userMessage = 'Verification failed. Please try again.';
      
      if (error.message.includes('expired')) {
        errorType = 'expired_token';
        userMessage = 'This verification link has expired. Please request a new one.';
      } else if (error.message.includes('Invalid signature')) {
        errorType = 'invalid_token';
        userMessage = 'Invalid verification link. Please check the link and try again.';
      } else if (error.message.includes('Malformed')) {
        errorType = 'invalid_token';
        userMessage = 'Invalid verification link format.';
      }

      return {
        success: false,
        error: userMessage,
        technicalError: error.message,
        errorType: errorType,
        canRetry: this.canRetryError(errorType)
      };
    }
  }

  /**
   * Get user verification status using the database function
   */
  async getUserVerificationStatus(userId) {
    try {
      this.init();
      
      const { data: result, error } = await this.admin
        .rpc('get_user_verification_status', {
          user_uuid: userId
        });

      if (error) {
        throw new Error(`Failed to get verification status: ${error.message}`);
      }

      if (!result || !result[0]) {
        return {
          success: true,
          status: {
            is_verified: false,
            verification_timestamp: null,
            verification_method: null,
            verification_token_id: null,
            has_valid_token: false,
            token_expires_at: null,
            attempts_remaining: 3,
            can_attempt_verification: true
          }
        };
      }

      const status = result[0];
      return {
        success: true,
        status: {
          is_verified: status.is_verified,
          verification_timestamp: status.verification_timestamp,
          verification_method: status.verification_method,
          verification_token_id: status.verification_token_id,
          has_valid_token: status.has_valid_token,
          token_expires_at: status.token_expires_at,
          attempts_remaining: status.attempts_remaining || 0,
          can_attempt_verification: status.can_attempt_verification || false
        }
      };
    } catch (error) {
      console.error('Get user verification status error:', error);
      return {
        success: false,
        error: error.message,
        errorType: 'system_error'
      };
    }
  }

  /**
   * Get verification error details
   */
  async getVerificationError(errorType) {
    try {
      this.init();
      
      const { data: errorData, error } = await this.admin
        .from('verification_error_messages')
        .select('*')
        .eq('error_type', errorType)
        .single();

      if (error || !errorData) {
        // Return default error message
        return {
          success: true,
          error: {
            error_type: errorType,
            user_message: 'An error occurred during verification. Please try again.',
            technical_message: error?.message || 'Unknown error',
            retry_allowed: true,
            retry_delay_minutes: 0
          }
        };
      }

      return {
        success: true,
        error: errorData
      };
    } catch (error) {
      console.error('Get verification error details error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a verification token (legacy method for compatibility)
   */
  async generateVerificationToken(userId, email, ip, userAgent) {
    try {
      this.init();
      
      // Use the new createVerificationToken method
      const result = await this.createVerificationToken(
        userId,
        'email',
        'email',
        60, // 1 hour
        ip,
        userAgent
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return {
        success: true,
        token: result.jwtToken,
        tokenId: result.tokenId,
        expiresAt: result.expiresAt
      };
    } catch (error) {
      console.error('Generate verification token error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify a token (legacy method for compatibility)
   */
  async verifyToken(token, ip, userAgent) {
    try {
      this.init();
      
      // Extract user ID from token
      const payload = verifyJwtHS256(token, VERIFICATION_JWT_SECRET);
      const userId = payload.sub;

      // Use the new verifyUserToken method
      const result = await this.verifyUserToken(
        userId,
        token,
        'email',
        ip,
        userAgent
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return {
        success: true,
        userId: result.userId,
        email: payload.email || 'user@example.com',
        verifiedAt: result.verifiedAt
      };
    } catch (error) {
      console.error('Verify token error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper method to map database errors to error types
   */
  mapDatabaseError(errorMessage) {
    if (errorMessage.includes('missing_fields')) return 'missing_fields';
    if (errorMessage.includes('invalid_token')) return 'invalid_token';
    if (errorMessage.includes('expired_token')) return 'expired_token';
    if (errorMessage.includes('max_attempts_exceeded')) return 'max_attempts_exceeded';
    if (errorMessage.includes('already_verified')) return 'already_verified';
    if (errorMessage.includes('database_error')) return 'database_error';
    return 'system_error';
  }

  /**
   * Helper method to determine if error can be retried
   */
  canRetryError(errorType) {
    const retryableErrors = ['invalid_token', 'expired_token', 'system_error'];
    return retryableErrors.includes(errorType);
  }

  /**
   * Clean up unused tokens for a user
   */
  async cleanupUserTokens(userId) {
    try {
      this.init();
      
      const { error } = await this.admin
        .from('verification_tokens')
        .delete()
        .eq('user_id', userId)
        .is('used_at', null)
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Cleanup user tokens error:', error);
      }
    } catch (error) {
      console.error('Cleanup user tokens error:', error);
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats() {
    try {
      this.init();
      
      // For dev mode, return mock stats
      if (process.env.DEV_AUTH_BYPASS === 'true') {
        return {
          totalUsers: 1,
          verifiedUsers: 1,
          pendingVerifications: 0,
          verificationRate: '100.0'
        };
      }
      
      const { count: verifiedCount } = await this.admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true);

      const { count: totalCount } = await this.admin
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: pendingTokens } = await this.admin
        .from('verification_tokens')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString());

      return {
        totalUsers: totalCount || 0,
        verifiedUsers: verifiedCount || 0,
        pendingVerifications: pendingTokens || 0,
        verificationRate: (totalCount || 0) > 0 ? (((verifiedCount || 0) / (totalCount || 1)) * 100).toFixed(1) : '0.0'
      };
    } catch (error) {
      console.error('Get verification stats error:', error);
      throw new Error(error.message);
    }
  }
}

export default EnhancedVerificationService;
