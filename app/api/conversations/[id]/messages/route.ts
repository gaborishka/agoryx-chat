import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { ConversationService } from '@/lib/services/conversation.service';
import { MessageService } from '@/lib/services/message.service';
import { AgentService } from '@/lib/services/agent.service';
import { OrchestrationService } from '@/lib/services/orchestration.service';
import { paginationSchema, createMessageSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { Agent } from '@/types';

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
 * Send a message and stream agent responses via SSE
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;

    // Get conversation with config
    const conversation = await ConversationService.getById(auth.user.id, id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const data = createMessageSchema.parse(body);

    // Get all agents and convert to Record format
    const agentList = await AgentService.listAll(auth.user.id);
    const agents: Record<string, Agent> = {};
    for (const agent of agentList) {
      agents[agent.id] = {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        avatar_url: agent.avatar_url || '',
        description: agent.description || '',
        ui_color: agent.ui_color,
        systemInstruction: agent.systemInstruction,
        isCustom: agent.isCustom,
        isSystem: agent.isSystem,
      };
    }

    // Map attachments with generated IDs
    const attachments = data.attachments?.map((att, idx) => ({
      ...att,
      id: `att-${Date.now()}-${idx}`,
    }));

    // Create orchestration service
    const orchestrator = new OrchestrationService({
      conversationId: id,
      userId: auth.user.id,
      userMessage: {
        content: data.content,
        attachments,
      },
      agentConfig: conversation.agentConfig,
      mode: conversation.mode,
      enableAutoReply: conversation.enableAutoReply,
      agents,
    });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of orchestrator.orchestrate()) {
            const eventData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          }
          controller.close();
        } catch (error) {
          const errorEvent = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream failed',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
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
