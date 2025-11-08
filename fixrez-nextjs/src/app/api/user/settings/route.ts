import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://oailemrpflfahdhoxbbx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { name, email, notifications, marketingEmails } = await request.json();

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update user profile in Supabase
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    // Update notification preferences (if table exists)
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: session.user.id,
          notifications: notifications ?? true,
          marketing_emails: marketingEmails ?? false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    } catch (prefError) {
      // Preferences table might not exist, log but don't fail the request
      console.log('Could not update preferences:', prefError);
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      user: {
        id: data.id,
        name: data.full_name,
        email: data.email,
        notifications,
        marketingEmails
      }
    });

  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}