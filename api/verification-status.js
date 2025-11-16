/**
 * Verification Status Endpoint
 * Returns the current user's verification status
 */

import { createClient } from '@supabase/supabase-js';
import VerificationService from './services/verificationService.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize verification service
const verificationService = new VerificationService();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authorization token provided' 
      });
    }

    // Verify the token with Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }

    console.log('🔍 Verification Status Debug (Production API):', {
      hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      userId: user.id,
      userEmail: user.email,
      emailConfirmedAt: user.email_confirmed_at,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    // Get verification status using the verification service
    const statusResult = await verificationService.getUserVerificationStatus(user.id);

    if (!statusResult.success) {
      console.error('❌ Failed to get verification status:', statusResult.error);
      
      // Fallback to basic verification based on email_confirmed_at
      const isVerified = Boolean(user.email_confirmed_at);
      return res.status(200).json({
        success: true,
        status: {
          is_verified: isVerified,
          verification_timestamp: user.email_confirmed_at,
          verification_method: isVerified ? 'supabase_email' : null,
          has_valid_token: false,
          token_expires_at: null
        }
      });
    }

    console.log('✅ Verification status retrieved:', statusResult.status);

    return res.status(200).json({
      success: true,
      status: statusResult.status
    });

  } catch (error) {
    console.error('❌ Error getting verification status:', error);
    
    // Fallback to basic verification
    return res.status(200).json({
      success: true,
      status: {
        is_verified: false,
        verification_timestamp: null,
        verification_method: null,
        has_valid_token: false,
        token_expires_at: null
      }
    });
  }
}