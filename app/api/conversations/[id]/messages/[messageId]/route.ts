import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { ConversationService } from '@/lib/services/conversation.service';
import { MessageService } from '@/lib/services/message.service';
import { updateMessageSchema } from '@/lib/validations';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string; messageId: string }>;
}

/**
 * PATCH /api/conversations/[id]/messages/[messageId]
 * Update a message (feedback, pin status)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id, messageId } = await params;

    // Verify conversation ownership
    const isOwner = await ConversationService.isOwner(auth.user.id, id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify message belongs to this conversation
    const messageConvoId = await MessageService.getConversationId(messageId);
    if (messageConvoId !== id) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateMessageSchema.parse(body);

    let message;

    // Handle feedback update
    if (data.feedback !== undefined) {
      message = await MessageService.updateFeedback(messageId, data.feedback);
    }

    // Handle pin toggle
    if (data.isPinned !== undefined) {
      message = await MessageService.togglePin(messageId);
    }

    // If no update was requested, just return the current message
    if (!message) {
      message = await MessageService.getById(messageId);
    }

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ data: message });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    console.error('PATCH /api/conversations/[id]/messages/[messageId] error:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
