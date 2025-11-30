import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { AdminService } from '@/lib/services/admin.service';
import { paginationSchema, adminUserFiltersSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);

    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    const filters = adminUserFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      tier: searchParams.get('tier') || undefined,
    });

    const result = await AdminService.listUsers(pagination, filters);

    return NextResponse.json({
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('GET /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    );
  }
}
