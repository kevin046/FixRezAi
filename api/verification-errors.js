/**
 * Verification Errors Endpoint
 * Returns verification errors for a user
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Get target user ID from URL path or use current user
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const targetUserId = pathParts[pathParts.length - 1] || user.id;

    // Only allow users to check their own errors unless they're admin
    if (targetUserId !== user.id && !user.user_metadata?.is_admin) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied' 
      });
    }

    console.log('🔍 Fetching verification errors:', {
      userId: user.id,
      targetUserId
    });

    // Check if service role key is available
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(200).json({
        success: true,
        errors: []
      });
    }

    // Fetch verification errors from database
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: errors, error } = await adminSupabase
      .from('verification_errors')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Failed to fetch verification errors:', error);
      return res.status(200).json({
        success: true,
        errors: []
      });
    }

    return res.status(200).json({
      success: true,
      errors: errors || []
    });

  } catch (error) {
    console.error('❌ Error fetching verification errors:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}