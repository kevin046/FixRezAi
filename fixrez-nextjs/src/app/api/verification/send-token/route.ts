import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VerificationService from '@/app/api/services/verificationServiceEnhanced.js';

const verificationService = new VerificationService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user;
    const { type = 'email', method = 'email' } = await request.json();

    // Use the enhanced service to create verification token
    const result = await verificationService.createVerificationToken(
      user.id,
      type,
      method,
      60 // 1 hour
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
      tokenId: result.tokenId,
      expiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('Error sending verification token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}