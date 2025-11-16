/**
 * Enhanced Verification Service
 * Provides comprehensive email verification with proper token management and audit logging
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERIFICATION_JWT_SECRET = process.env.VERIFICATION_JWT_SECRET || (process.env.SUPABASE_SERVICE_ROLE_KEY ? crypto.createHash('sha256').update(String(process.env.SUPABASE_SERVICE_ROLE_KEY)).digest('hex') : crypto.randomBytes(32).toString('hex'));
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

// Audit logging function
async function auditLog(admin, entry) {
  try {
    await admin.from('verification_audit_log').insert({
      user_id: entry.userId,
      action: entry.action,
      action_by_ip: entry.ip,
      action_by_user_agent: entry.userAgent,
      verification_token_id: entry.tokenId,
      details: entry.details || {},
      success: entry.success,
      error_message: entry.error
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

class VerificationService {
  constructor() {
    this.admin = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    console.log('DEBUG: process.env.SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS' : 'MISSING');
    console.log('DEBUG: process.env.SUPABASE_URL:', process.env.SUPABASE_URL ? 'EXISTS' : 'MISSING');
    console.log('DEBUG: process.env.VERIFICATION_JWT_SECRET:', process.env.VERIFICATION_JWT_SECRET ? 'EXISTS' : 'MISSING');
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.admin = null;
      this.initialized = true;
      return;
    }
    this.admin = createClient(process.env.SUPABASE_URL || SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    this.initialized = true;
  }

  /**
   * Generate a verification token for a user
   */
  async generateVerificationToken(userId, email, ip, userAgent) {
    try {
      this.init(); // Initialize service if not already done
      
      // Clean up any existing unused tokens for this user
      await this.cleanupUserTokens(userId);

      const nowSec = Math.floor(Date.now() / 1000);
      const expirySec = nowSec + (TOKEN_EXPIRY_HOURS * 60 * 60);
      const jti = crypto.randomBytes(16).toString('hex');
      
      const payload = {
        sub: userId,
        email: email,
        type: 'email_verification',
        iat: nowSec,
        exp: expirySec,
        jti: jti
      };

      const token = signJwtHS256(payload, VERIFICATION_JWT_SECRET);
      const tokenHash = generateTokenHash(token);

      // Store token in database (skip for dev bypass mode)
      let tokenData;
      if (userId === '00000000-0000-0000-0000-000000000000') {
        // For dev bypass mode, create a mock token record
        tokenData = {
          id: crypto.randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          token_type: 'email_verification',
          expires_at: new Date(expirySec * 1000).toISOString(),
          created_at: new Date().toISOString(),
          created_by_ip: ip,
          metadata: {
            user_agent: userAgent,
            jti: jti,
            dev_bypass: true
          }
        };
      } else {
        // For real users, store in database
        const { data: dbTokenData, error: tokenError } = await this.admin
          .from('verification_tokens')
          .insert({
            user_id: userId,
            token_hash: tokenHash,
            token_type: 'email_verification',
            expires_at: new Date(expirySec * 1000).toISOString(),
            created_by_ip: ip,
            metadata: {
              user_agent: userAgent,
              jti: jti
            }
          })
          .select()
          .single();

        if (tokenError) {
          throw new Error(`Failed to store token: ${tokenError.message}`);
        }
        tokenData = dbTokenData;
      }

      // Audit log
      if (this.admin) {
        await auditLog(this.admin, {
          userId: userId,
          action: 'token_created',
          ip: ip,
          userAgent: userAgent,
          tokenId: tokenData.id,
          success: true,
          details: {
            token_type: 'email_verification',
            expires_at: new Date(expirySec * 1000).toISOString()
          }
        });
      }

      return {
        success: true,
        token: token,
        tokenId: tokenData.id,
        expiresAt: new Date(expirySec * 1000).toISOString()
      };
    } catch (error) {
      console.error('Generate verification token error:', error);
      
      if (this.admin) {
        await auditLog(this.admin, {
          userId: userId,
          action: 'token_creation_failed',
          ip: ip,
          userAgent: userAgent,
          success: false,
          error: error.message
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify a token and mark user as verified
   */
  async verifyToken(token, ip, userAgent) {
    try {
      this.init(); // Initialize service if not already done
      
      if (!token) {
        throw new Error('Token is required');
      }

      // Verify JWT
      const payload = verifyJwtHS256(token, VERIFICATION_JWT_SECRET);
      const { sub: userId, email, jti } = payload;

      if (!userId || !email) {
        throw new Error('Invalid token payload');
      }

      const tokenHash = generateTokenHash(token);

      // Handle dev bypass mode - skip database lookup for dev user
      let tokenData;
      if (userId === '00000000-0000-0000-0000-000000000000') {
        // For dev bypass, create a mock token data
        tokenData = {
          id: crypto.randomUUID(),
          user_id: userId,
          token_hash: tokenHash,
          token_type: 'email_verification',
          expires_at: new Date(payload.exp * 1000).toISOString(),
          used_at: null,
          created_at: new Date(payload.iat * 1000).toISOString(),
          metadata: {
            jti: jti,
            dev_bypass: true
          }
        };
      } else {
        // For real users, check database
        const { data: dbTokenData, error: tokenError } = await this.admin
          .from('verification_tokens')
          .select('*')
          .eq('token_hash', tokenHash)
          .eq('user_id', userId)
          .eq('token_type', 'email_verification')
          .is('used_at', null)
          .single();

        if (tokenError || !dbTokenData) {
          throw new Error('Invalid or expired token');
        }
        tokenData = dbTokenData;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      if (now > expiresAt) {
        throw new Error('Token has expired');
      }

      // Mark token as used
      const { error: updateError } = await this.admin
        .from('verification_tokens')
        .update({ used_at: now.toISOString() })
        .eq('id', tokenData.id);

      if (updateError) {
        throw new Error(`Failed to update token: ${updateError.message}`);
      }

      // Update user profile with verification status (skip for dev bypass)
      if (userId !== '00000000-0000-0000-0000-000000000000') {
        const { error: profileError } = await this.admin
          .from('profiles')
          .upsert({
            id: userId,
            verified: true,
            verification_timestamp: now.toISOString(),
            verification_method: 'email_token',
            verification_token_id: tokenData.id,
            updated_at: now.toISOString()
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      }

      // Audit log for successful verification
      if (this.admin) {
        await auditLog(this.admin, {
          userId: userId,
          action: 'token_used',
          ip: ip,
          userAgent: userAgent,
          tokenId: tokenData.id,
          success: true,
          details: {
            verification_method: 'email_token',
            verification_timestamp: now.toISOString()
          }
        });
      }

      return {
        success: true,
        userId: userId,
        email: email,
        verifiedAt: now.toISOString()
      };
    } catch (error) {
      console.error('Token verification error:', error);

      if (this.admin) {
        await auditLog(this.admin, {
          userId: null,
          action: 'verification_failed',
          ip: ip,
          userAgent: userAgent,
          success: false,
          error: error.message
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user verification status
   */
  async getUserVerificationStatus(userId) {
    try {
      this.init(); // Initialize service if not already done
      
      console.log('🔧 VerificationService.getUserVerificationStatus called:', {
        userId,
        hasAdmin: !!this.admin,
        initialized: this.initialized
      });
      
      // Handle dev bypass user
      if (userId === '00000000-0000-0000-0000-000000000000') {
        console.log('🔄 Dev bypass user detected');
        return {
          success: true,
          status: {
            is_verified: true,
            verification_timestamp: new Date().toISOString(),
            verification_method: 'dev_bypass',
            has_valid_token: false,
            token_expires_at: null
          }
        };
      }
      
      if (!this.admin) {
        console.log('⚠️ Admin client not available, falling back to basic verification');
        return {
          success: true,
          status: {
            is_verified: false,
            verification_timestamp: null,
            verification_method: null,
            has_valid_token: false,
            token_expires_at: null
          }
        };
      }
      
      const { data, error } = await this.admin
        .rpc('get_user_verification_status', { user_uuid: userId });

      if (error) {
        console.error('❌ RPC call failed:', error);
        throw new Error(`Failed to get verification status: ${error.message}`);
      }

      console.log('✅ Verification status retrieved:', data[0]);

      return {
        success: true,
        status: data[0] || {
          is_verified: false,
          verification_timestamp: null,
          verification_method: null,
          has_valid_token: false,
          token_expires_at: null
        }
      };
    } catch (error) {
      console.error('Get verification status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up unused tokens for a user
   */
  async cleanupUserTokens(userId) {
    try {
      this.init(); // Initialize service if not already done
      
      // Handle dev bypass user - skip cleanup since there's no real user
      if (userId === '00000000-0000-0000-0000-000000000000') {
        return;
      }
      
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
   * Send verification reminder email
   */
  async sendVerificationReminder(userId, email, ip, userAgent) {
    try {
      this.init(); // Initialize service if not already done
      // Check if user already has a valid token
      const statusResult = await this.getUserVerificationStatus(userId);
      if (statusResult.success && statusResult.status.has_valid_token) {
        return {
          success: false,
          error: 'User already has a valid verification token'
        };
      }

      // Generate new token
      const tokenResult = await this.generateVerificationToken(userId, email, ip, userAgent);
      if (!tokenResult.success) {
        return tokenResult;
      }

      // Here you would integrate with your email service (Resend, etc.)
      // For now, return the token data
      return {
        success: true,
        token: tokenResult.token,
        expiresAt: tokenResult.expiresAt
      };
    } catch (error) {
      console.error('Send verification reminder error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats() {
    try {
      this.init(); // Initialize service if not already done
      
      console.log('DEBUG: DEV_AUTH_BYPASS =', process.env.DEV_AUTH_BYPASS);
      
      // For dev mode, return mock stats since we don't have real users
      if (process.env.DEV_AUTH_BYPASS === 'true') {
        console.log('DEV mode: returning mock stats');
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

export default VerificationService;
