/**
 * Verification Metrics Endpoint
 * Returns verification statistics and metrics
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

    // Check if user is admin (simple check for now)
    const isAdmin = user.user_metadata?.is_admin || false;

    if (!isAdmin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    console.log('🔍 Fetching verification metrics for admin:', {
      userId: user.id,
      email: user.email
    });

    // Get verification statistics
    const stats = await verificationService.getVerificationStats();

    return res.status(200).json({
      success: true,
      metrics: stats
    });

  } catch (error) {
    console.error('❌ Error fetching verification metrics:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}