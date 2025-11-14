import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check verification status using type assertion
    const user = session.user as any;
    if (!user.verified) {
      return NextResponse.json(
        { error: 'Account verification required' },
        { status: 403 }
      );
    }

    const { text, type = 'seo' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text is too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Simulate AI optimization (replace with actual AI service)
    let optimizedText = text;

    switch (type) {
      case 'seo':
        optimizedText = optimizeForSEO(text);
        break;
      case 'engagement':
        optimizedText = optimizeForEngagement(text);
        break;
      case 'clarity':
        optimizedText = optimizeForClarity(text);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid optimization type' },
          { status: 400 }
        );
    }

    // Store optimization record
    try {
      const { error: recordError } = await supabase
        .from('optimizations')
        .insert({
          user_id: user.id,
          original_text: text,
          optimized_text: optimizedText,
          optimization_type: type,
          score_improvement: Math.floor(Math.random() * 30) + 10, // Simulate score
          created_at: new Date().toISOString(),
        });

      if (recordError) {
        console.error('Failed to record optimization:', recordError);
      }
    } catch (recordError) {
      console.error('Error recording optimization:', recordError);
    }

    return NextResponse.json({
      original_text: text,
      optimized_text: optimizedText,
      type,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Optimization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Placeholder optimization functions
function optimizeForSEO(text: string): string {
  // Add meta description placeholder
  let optimized = text;
  
  // Add some SEO improvements
  optimized = optimized.replace(/\b(good|nice|great)\b/gi, (match) => {
    const replacements = {
      'good': 'excellent',
      'nice': 'outstanding',
      'great': 'exceptional'
    };
    return replacements[match.toLowerCase() as keyof typeof replacements] || match;
  });

  // Add some structure
  if (!optimized.includes('##')) {
    optimized = `## Overview\n\n${optimized}\n\n## Key Benefits\n\n* Improved search visibility\n* Better user engagement\n* Enhanced readability`;
  }

  return optimized;
}

function optimizeForEngagement(text: string): string {
  let optimized = text;
  
  // Add engaging elements
  optimized = optimized.replace(/\./g, '!');
  
  // Add call-to-action
  if (!optimized.toLowerCase().includes('discover') && !optimized.toLowerCase().includes('learn')) {
    optimized += '\n\n🚀 Ready to transform your content? Discover the power of AI optimization today!';
  }
  
  // Add emotional language
  optimized = optimized.replace(/\b(important)\b/gi, 'absolutely crucial');
  optimized = optimized.replace(/\b(help)\b/gi, 'revolutionize');
  
  return optimized;
}

function optimizeForClarity(text: string): string {
  let optimized = text;
  
  // Simplify complex sentences
  optimized = optimized.replace(/\bin order to\b/gi, 'to');
  optimized = optimized.replace(/\bdue to the fact that\b/gi, 'because');
  optimized = optimized.replace(/\bat this point in time\b/gi, 'now');
  
  // Add structure
  if (!optimized.includes('###')) {
    optimized = `### Main Points\n\n${optimized}\n\n### Summary\n\nThis content has been optimized for maximum clarity and understanding.`;
  }
  
  return optimized;
}