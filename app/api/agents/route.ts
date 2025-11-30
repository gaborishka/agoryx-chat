import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authErrorResponse } from '@/lib/api/auth';
import { AgentService } from '@/lib/services/agent.service';
import { createAgentSchema } from '@/lib/validations';
import { ZodError } from 'zod';

/**
 * GET /api/agents
 * List all agents (system + user's custom agents)
 */
export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const agents = await AgentService.listAll(auth.user.id);

    return NextResponse.json({ data: agents });
  } catch (error) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Create a custom agent
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  try {
    const body = await request.json();
    const data = createAgentSchema.parse(body);

    const agent = await AgentService.createCustom(auth.user.id, data);

    return NextResponse.json({ data: agent }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation failed: ${errors}` }, { status: 400 });
    }

    if (error instanceof Error) {
      if (error.message === 'Agent ID conflicts with a system agent') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === 'An agent with this ID already exists') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    console.error('POST /api/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
