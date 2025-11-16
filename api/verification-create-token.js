/**
 * Verification Create Token Endpoint
 * Creates a new verification token for email verification
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    // Get request body
    const { email, type = 'email' } = req.body || {};
    const finalEmail = email || user.email;

    if (!finalEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    console.log('🔍 Creating verification token:', {
      userId: user.id,
      email: finalEmail,
      type
    });

    // Create verification token
    const result = await verificationService.generateVerificationToken(
      user.id,
      finalEmail,
      req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      req.headers['user-agent'] || 'unknown'
    );

    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      expiresAt: result.expiresAt,
      tokenId: result.tokenId
    });

  } catch (error) {
    console.error('❌ Error creating verification token:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}