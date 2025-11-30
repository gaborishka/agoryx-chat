import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { ConversationService } from '@/lib/services/conversation.service';
import { MessageService } from '@/lib/services/message.service';
import { paginationSchema, createMessageSchema } from '@/lib/validations';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/conversations/[id]/messages
 * List messages for a conversation (paginated)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Verify ownership
    const isOwner = await ConversationService.isOwner(auth.user.id, id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
    });

    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
    const result = await MessageService.list(id, pagination, order);

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

    console.error('GET /api/conversations/[id]/messages error:', error);
    return NextResponse.json(
      { error: 'Failed to list messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/[id]/messages
 * Create a new user message
 * Note: Orchestration (agent responses) will be added in Sprint 3
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;

    // Verify ownership
    const isOwner = await ConversationService.isOwner(auth.user.id, id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = createMessageSchema.parse(body);

    const message = await MessageService.create(id, auth.user.id, data);

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('POST /api/conversations/[id]/messages error:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
