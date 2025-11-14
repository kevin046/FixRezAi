import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import VerificationService from '@/app/api/services/verificationServiceEnhanced';

const verificationService = new VerificationService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user;
    const targetUserId = userId || user.id;

    // Only allow users to check their own status unless they're admin
    if (targetUserId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Use the enhanced service to get verification status via database function
    const statusResult = await verificationService.getUserVerificationStatus(targetUserId);

    if (!statusResult.success) {
      return NextResponse.json(
        { success: false, error: statusResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: statusResult.status
    });
  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}