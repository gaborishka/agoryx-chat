import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { AgentService } from '@/lib/services/agent.service';
import { updateAgentSchema } from '@/lib/validations';
import { ZodError } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]
 * Get a single agent
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;

    const agent = await AgentService.getById(auth.user.id, id);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ data: agent });
  } catch (error) {
    console.error('GET /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to get agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/[id]
 * Update a custom agent
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateAgentSchema.parse(body);

    const agent = await AgentService.update(auth.user.id, id, data);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ data: agent });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'Cannot update system agents') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('PATCH /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[id]
 * Delete a custom agent
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const { id } = await params;

    const deleted = await AgentService.delete(auth.user.id, id);

    if (!deleted) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot delete system agents') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('DELETE /api/agents/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
