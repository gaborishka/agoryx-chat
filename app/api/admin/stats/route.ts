import { NextResponse } from 'next/server';
import { requireAdmin, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { AdminService } from '@/lib/services/admin.service';

/**
 * GET /api/admin/stats
 * Get admin dashboard stats
 */
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const stats = await AdminService.getStats();

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get admin stats' },
      { status: 500 }
    );
  }
}
