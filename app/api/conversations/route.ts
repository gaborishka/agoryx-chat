import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { ConversationService } from '@/lib/services/conversation.service';
import { paginationSchema, createConversationSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * GET /api/conversations
 * List user's conversations (paginated)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    const result = await ConversationService.list(auth.user.id, pagination);

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

    console.error('GET /api/conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = createConversationSchema.parse(body);

    const conversation = await ConversationService.create(auth.user.id, data);

    return NextResponse.json({ data: conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('POST /api/conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
