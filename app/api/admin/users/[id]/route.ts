import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { AdminService } from '@/lib/services/admin.service';
import { adminUpdateUserSchema } from '@/lib/validations';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]
 * Get a single user (admin only)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;

    const user = await AdminService.getUserById(id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('GET /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update a user (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = adminUpdateUserSchema.parse(body);

    const user = await AdminService.updateUser(id, data);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
