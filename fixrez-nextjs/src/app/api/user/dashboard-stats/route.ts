import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get optimization statistics
    const { data: optimizations, error: optimizationsError } = await supabase
      .from('optimizations')
      .select('id, status, score, created_at, filename')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (optimizationsError) {
      console.error('Error fetching optimizations:', optimizationsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch optimization data' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalOptimizations = optimizations.length;
    const successfulOptimizations = optimizations.filter(opt => opt.status === 'completed').length;
    
    // Calculate average score improvement (simplified calculation)
    const completedOptimizations = optimizations.filter(opt => opt.status === 'completed');
    const averageScoreImprovement = completedOptimizations.length > 0
      ? Math.round(completedOptimizations.reduce((sum, opt) => sum + (opt.score || 0), 0) / completedOptimizations.length)
      : 0;

    // Format recent optimizations
    const recentOptimizations = optimizations.map(opt => ({
      id: opt.id,
      filename: opt.filename || 'Unknown File',
      score: opt.score || 0,
      created_at: opt.created_at,
      status: opt.status || 'unknown'
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalOptimizations,
        successfulOptimizations,
        averageScoreImprovement,
        recentOptimizations
      }
    });

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}