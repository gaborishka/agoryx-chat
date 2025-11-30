import { NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { UserService } from '@/lib/services/user.service';

/**
 * GET /api/user/credits
 * Get current user's credits and usage stats
 */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const creditsInfo = await UserService.getCreditsAndUsage(auth.user.id);

    if (!creditsInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: creditsInfo });
  } catch (error) {
    console.error('GET /api/user/credits error:', error);
    return NextResponse.json(
      { error: 'Failed to get credits info' },
      { status: 500 }
    );
  }
}
