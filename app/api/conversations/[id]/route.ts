import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { ConversationService } from '@/lib/services/conversation.service';
import { MessageService } from '@/lib/services/message.service';
import { updateConversationSchema, paginationSchema } from '@/lib/validations';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/conversations/[id]
 * Get a conversation with its messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const conversation = await ConversationService.getById(auth.user.id, id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages with pagination
    const messagePagination = paginationSchema.parse({
      page: searchParams.get('messagesPage') || '1',
      limit: searchParams.get('messagesLimit') || '50',
    });

    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
    const messages = await MessageService.list(id, messagePagination, order);

    return NextResponse.json({
      data: {
        ...conversation,
        messages: messages.data,
        messagesPagination: {
          total: messages.total,
          page: messages.page,
          totalPages: messages.totalPages,
        },
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/conversations/[id]
 * Update a conversation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateConversationSchema.parse(body);

    const conversation = await ConversationService.update(auth.user.id, id, data);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ data: conversation });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('PATCH /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation and all its messages
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;

    const deleted = await ConversationService.delete(auth.user.id, id);

    if (!deleted) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
