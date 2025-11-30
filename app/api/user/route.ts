import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { UserService } from '@/lib/services/user.service';
import { updateUserSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * GET /api/user
 * Get current user's profile
 */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const profile = await UserService.getProfile(auth.user.id);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('GET /api/user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const profile = await UserService.updateProfile(auth.user.id, data);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'Email already in use') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error('PATCH /api/user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
