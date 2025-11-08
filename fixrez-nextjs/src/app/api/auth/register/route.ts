import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        full_name: name,
        email,
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create user preferences
    const { error: prefsError } = await supabase
      .from('user_preferences')
      .insert({
        user_id: user.id,
        notifications: true,
        marketing_emails: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (prefsError) {
      console.error('Preferences creation error:', prefsError);
      // Don't fail the registration if preferences creation fails
    }

    // Send verification email (placeholder)
    try {
      // This would typically integrate with your email service
      console.log(`Verification email would be sent to: ${email}`);
      
      // For now, we'll create a verification token in the database
      const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const { error: tokenError } = await supabase
        .from('verification_tokens')
        .insert({
          user_id: user.id,
          token: verificationToken,
          type: 'email',
          method: 'email',
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        });

      if (tokenError) {
        console.error('Verification token creation error:', tokenError);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail registration if email sending fails
    }

    return NextResponse.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}