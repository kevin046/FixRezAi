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
    const { token, type = 'email' } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Use the enhanced service to verify token via database function
    const verifyResult = await verificationService.verifyUserToken(
      user.id,
      token,
      type
    );

    if (!verifyResult.success) {
      return NextResponse.json(
        { success: false, error: verifyResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      user_id: verifyResult.userId,
      verified_at: verifyResult.verifiedAt
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}