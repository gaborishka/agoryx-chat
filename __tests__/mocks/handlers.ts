import { http, HttpResponse, delay } from 'msw';

// Default mock data
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  credits_remaining: 100,
  subscription_tier: 'free' as const,
  subscription_status: 'active' as const,
  role: 'user' as const,
  is_banned: false,
  cancel_at_period_end: false,
};

const mockConversation = {
  id: 'conv-123',
  user_id: 'user-123',
  title: 'Test Conversation',
  preview: 'Hello...',
  mode: 'collaborative',
  agentConfig: {
    system1Id: 'flash',
    system2Id: 'sage',
  },
  enableAutoReply: false,
  settings: {
    extendedDebate: false,
    autoScroll: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockMessage = {
  id: 'msg-123',
  conversation_id: 'conv-123',
  sender_type: 'user',
  sender_id: 'user-123',
  content: 'Hello, world!',
  created_at: new Date().toISOString(),
};

const mockAgents = {
  system: [
    {
      id: 'flash',
      name: 'Flash',
      model: 'gemini-2.0-flash',
      description: 'Fast responses',
      ui_color: 'blue',
      isSystem: true,
    },
    {
      id: 'sage',
      name: 'Sage',
      model: 'gemini-2.0-flash',
      description: 'Analytical responses',
      ui_color: 'purple',
      isSystem: true,
    },
  ],
  custom: [],
};

export const handlers = [
  // ============================================
  // Conversations
  // ============================================
  http.get('/api/conversations', async () => {
    await delay(10);
    return HttpResponse.json({
      data: [mockConversation],
      pagination: {
        total: 1,
        page: 1,
        totalPages: 1,
      },
    });
  }),

  http.post('/api/conversations', async ({ request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockConversation,
      ...body,
      id: `conv-${Date.now()}`,
    }, { status: 201 });
  }),

  http.get('/api/conversations/:id', async ({ params }) => {
    await delay(10);
    return HttpResponse.json({
      ...mockConversation,
      id: params.id as string,
    });
  }),

  http.patch('/api/conversations/:id', async ({ params, request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockConversation,
      id: params.id as string,
      ...body,
    });
  }),

  http.delete('/api/conversations/:id', async () => {
    await delay(10);
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Messages with SSE Streaming
  // ============================================
  http.get('/api/conversations/:id/messages', async () => {
    await delay(10);
    return HttpResponse.json({
      data: [mockMessage],
      pagination: {
        total: 1,
        page: 1,
        totalPages: 1,
      },
    });
  }),

  http.post('/api/conversations/:id/messages', async () => {
    // Simulate SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Simulate user message creation
        controller.enqueue(
          encoder.encode('data: {"type":"user_message","messageId":"msg-user-1"}\n\n')
        );

        // Simulate agent start
        controller.enqueue(
          encoder.encode('data: {"type":"agent_start","messageId":"msg-agent-1","agentId":"flash"}\n\n')
        );

        // Simulate text chunks
        controller.enqueue(
          encoder.encode('data: {"type":"text","messageId":"msg-agent-1","content":"Hello"}\n\n')
        );
        controller.enqueue(
          encoder.encode('data: {"type":"text","messageId":"msg-agent-1","content":" there!"}\n\n')
        );

        // Simulate agent done
        controller.enqueue(
          encoder.encode('data: {"type":"agent_done","messageId":"msg-agent-1","cost":0.001,"totalTokens":50}\n\n')
        );

        // Simulate turn complete
        controller.enqueue(
          encoder.encode('data: {"type":"turn_complete","turn":1}\n\n')
        );

        // Simulate done
        controller.enqueue(
          encoder.encode('data: {"type":"done","totalCost":0.001}\n\n')
        );

        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),

  http.patch('/api/messages/:id', async ({ request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockMessage,
      ...body,
    });
  }),

  // ============================================
  // User & Credits
  // ============================================
  http.get('/api/user/profile', async () => {
    await delay(10);
    return HttpResponse.json(mockUser);
  }),

  http.patch('/api/user/profile', async ({ request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUser,
      ...body,
    });
  }),

  http.get('/api/user/credits', async () => {
    await delay(10);
    return HttpResponse.json({
      credits_remaining: mockUser.credits_remaining,
      subscription_tier: mockUser.subscription_tier,
      subscription_status: mockUser.subscription_status,
      cancel_at_period_end: mockUser.cancel_at_period_end,
      recentUsage: {
        total_tokens: 1000,
        total_cost: 0.05,
        count: 10,
      },
    });
  }),

  // ============================================
  // Agents
  // ============================================
  http.get('/api/agents', async () => {
    await delay(10);
    return HttpResponse.json(mockAgents);
  }),

  http.post('/api/agents', async ({ request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...body,
      isCustom: true,
    }, { status: 201 });
  }),

  http.patch('/api/agents/:id', async ({ params, request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: params.id as string,
      ...body,
    });
  }),

  http.delete('/api/agents/:id', async () => {
    await delay(10);
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Billing
  // ============================================
  http.get('/api/billing/history', async () => {
    await delay(10);
    return HttpResponse.json({
      history: [],
      total: 0,
    });
  }),

  http.post('/api/billing/checkout', async () => {
    await delay(10);
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/test',
      sessionId: 'cs_test_123',
    });
  }),

  http.post('/api/billing/portal', async () => {
    await delay(10);
    return HttpResponse.json({
      url: 'https://billing.stripe.com/test',
    });
  }),

  http.post('/api/billing/cancel', async () => {
    await delay(10);
    return HttpResponse.json({
      success: true,
    });
  }),

  http.post('/api/billing/update', async () => {
    await delay(10);
    return HttpResponse.json({
      success: true,
    });
  }),

  // ============================================
  // Legacy Chat API
  // ============================================
  http.post('/api/chat', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"text","content":"Hello from AI"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"done","totalTokens":25}\n\n'));
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }),

  http.put('/api/chat', async () => {
    await delay(10);
    return HttpResponse.json({
      text: 'Transcribed audio text',
    });
  }),

  // ============================================
  // Admin
  // ============================================
  http.get('/api/admin/stats', async () => {
    await delay(10);
    return HttpResponse.json({
      totalUsers: 100,
      activeSubscriptions: 25,
      monthlyRevenue: 500,
      apiHealth: 'healthy',
      errorRate: 0.01,
    });
  }),

  http.get('/api/admin/users', async () => {
    await delay(10);
    return HttpResponse.json({
      data: [mockUser],
      pagination: {
        total: 1,
        page: 1,
        totalPages: 1,
      },
    });
  }),

  http.patch('/api/admin/users/:id', async ({ request }) => {
    await delay(10);
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockUser,
      ...body,
    });
  }),
];

// Export mock data for use in tests
export { mockUser, mockConversation, mockMessage, mockAgents };
