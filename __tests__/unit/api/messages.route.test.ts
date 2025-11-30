import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/conversations/[id]/messages/route';

// Mock auth
vi.mock('@/lib/api/auth', () => ({
  requireAuth: vi.fn(),
  isAuthError: vi.fn((result) => 'error' in result),
  authErrorResponse: vi.fn((error) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: error.error }, { status: error.status });
  }),
}));

// Mock services
vi.mock('@/lib/services/conversation.service', () => ({
  ConversationService: {
    isOwner: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('@/lib/services/message.service', () => ({
  MessageService: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/lib/services/agent.service', () => ({
  AgentService: {
    listAll: vi.fn(),
  },
}));

// Create mock for orchestrate method
const mockOrchestrate = vi.fn();

vi.mock('@/lib/services/orchestration.service', () => ({
  OrchestrationService: class MockOrchestrationService {
    orchestrate = mockOrchestrate;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: unknown) {}
  },
}));

import { requireAuth } from '@/lib/api/auth';
import { ConversationService } from '@/lib/services/conversation.service';
import { MessageService } from '@/lib/services/message.service';
import { AgentService } from '@/lib/services/agent.service';

const mockRequireAuth = vi.mocked(requireAuth);
const mockIsOwner = vi.mocked(ConversationService.isOwner);
const mockGetById = vi.mocked(ConversationService.getById);
const mockMessageList = vi.mocked(MessageService.list);
const mockAgentListAll = vi.mocked(AgentService.listAll);

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  credits_remaining: 100,
  subscription_tier: 'free' as const,
  role: 'user' as const,
  is_banned: false,
};

describe('Messages API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/conversations/[id]/messages', () => {
    it('should return 401 when not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ error: 'Unauthorized', status: 401 });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages');
      const response = await GET(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 404 when conversation not found', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockIsOwner.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages');
      const response = await GET(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Conversation not found');
    });

    it('should return paginated messages', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockIsOwner.mockResolvedValue(true);
      mockMessageList.mockResolvedValue({
        data: [
          { id: 'msg-1', content: 'Hello', sender_type: 'user', sender_id: 'user-123', created_at: new Date() },
          { id: 'msg-2', content: 'Hi!', sender_type: 'agent', sender_id: 'flash', created_at: new Date() },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages?page=1&limit=20');
      const response = await GET(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({ total: 2, page: 1, totalPages: 1 });
    });

    it('should use default pagination when not provided', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockIsOwner.mockResolvedValue(true);
      mockMessageList.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages');
      const response = await GET(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(200);
      expect(mockMessageList).toHaveBeenCalledWith('conv-123', { page: 1, limit: 50 }, 'asc');
    });

    it('should respect order parameter', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockIsOwner.mockResolvedValue(true);
      mockMessageList.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages?order=desc');
      const response = await GET(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(200);
      expect(mockMessageList).toHaveBeenCalledWith('conv-123', expect.any(Object), 'desc');
    });

    it('should return 400 for invalid pagination', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockIsOwner.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages?page=0');
      const response = await GET(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
    });
  });

  describe('POST /api/conversations/[id]/messages', () => {
    const mockConversation = {
      id: 'conv-123',
      user_id: 'user-123',
      title: 'Test',
      mode: 'collaborative' as const,
      agentConfig: { system1Id: 'flash', system2Id: 'sage' },
      enableAutoReply: false,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAgents = [
      { id: 'flash', name: 'Flash', model: 'gemini-2.5-flash', ui_color: 'blue', isCustom: false, isSystem: true },
      { id: 'sage', name: 'Sage', model: 'gemini-3-pro', ui_color: 'amber', isCustom: false, isSystem: true },
    ];

    it('should return 401 when not authenticated', async () => {
      mockRequireAuth.mockResolvedValue({ error: 'Unauthorized', status: 401 });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 when conversation not found', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockGetById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(404);
    });

    it('should return 400 for empty content', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockGetById.mockResolvedValue(mockConversation);

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Validation failed');
    });

    it('should return SSE stream on success', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockGetById.mockResolvedValue(mockConversation);
      mockAgentListAll.mockResolvedValue(mockAgents);

      // Mock OrchestrationService orchestrate method
      mockOrchestrate.mockImplementation(async function* () {
        yield { type: 'user_message', messageId: 'msg-user-1' };
        yield { type: 'agent_start', messageId: 'msg-agent-1', agentId: 'flash' };
        yield { type: 'text', messageId: 'msg-agent-1', content: 'Hello!' };
        yield { type: 'agent_done', messageId: 'msg-agent-1', cost: 0.01, totalTokens: 10 };
        yield { type: 'done', cost: 0.01 };
      });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('should handle attachments in request', async () => {
      mockRequireAuth.mockResolvedValue({ user: mockUser });
      mockGetById.mockResolvedValue(mockConversation);
      mockAgentListAll.mockResolvedValue(mockAgents);

      mockOrchestrate.mockImplementation(async function* () {
        yield { type: 'done', cost: 0 };
      });

      const request = new NextRequest('http://localhost:3000/api/conversations/conv-123/messages', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Check this image',
          attachments: [
            { type: 'image', mimeType: 'image/png', name: 'test.png', data: 'base64data' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'conv-123' }) });

      expect(response.status).toBe(200);
    });
  });
});
