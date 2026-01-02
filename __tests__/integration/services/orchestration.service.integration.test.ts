import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, clearTestDB } from '../../mocks/db';
import { OrchestrationService, OrchestrationConfig, StreamEvent } from '@/lib/services/orchestration.service';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { createTestUser } from '../../mocks/factories/user.factory';
import { createTestConversation } from '../../mocks/factories/conversation.factory';
import { SYSTEM_AGENTS } from '@/scripts/seed/data/agents.data';
import { Agent } from '@/types';

// Mock the connectDB to avoid connecting to real DB
vi.mock('@/lib/db/mongoose', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Mock the provider
const mockGenerateStream = vi.fn();
vi.mock('@/lib/providers', () => ({
  getProvider: vi.fn(() => ({
    name: 'gemini',
    generateStream: mockGenerateStream,
  })),
  getProviderFromModel: vi.fn(() => 'gemini'),
}));

// Convert SYSTEM_AGENTS seed data to Agent type for tests
const testAgents: Record<string, Agent> = Object.fromEntries(
  SYSTEM_AGENTS.map((agent) => [
    agent.agent_id,
    {
      id: agent.agent_id,
      name: agent.name,
      model: agent.modelName,
      avatar_url: agent.avatar_url,
      description: agent.description,
      ui_color: agent.ui_color,
      systemInstruction: agent.systemInstruction,
      isSystem: true,
    },
  ])
);

// Helper to create mock stream generator
function createMockStream(chunks: Array<{ type: string; content?: string; totalTokens?: number; error?: string }>) {
  return async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  };
}

// Helper to collect all events from orchestration
async function collectEvents(orchestrator: OrchestrationService): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of orchestrator.orchestrate()) {
    events.push(event);
  }
  return events;
}

describe('OrchestrationService Integration Tests', () => {
  let testUserId: string;
  let testConversationId: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTestDB();

    // Create test user with sufficient credits
    const userData = createTestUser({
      credits_remaining: 100,
      subscription_tier: 'pro',
    });
    const savedUser = await User.create(userData);
    testUserId = savedUser._id.toString();

    // Create test conversation
    const convData = createTestConversation({
      user_id: savedUser._id,
      mode: 'collaborative',
    });
    const savedConv = await Conversation.create(convData);
    testConversationId = savedConv._id.toString();
  });

  afterEach(async () => {
    vi.resetAllMocks();
  });

  describe('Pre-flight Credit Validation', () => {
    it('should yield error event when user has insufficient credits', async () => {
      // Create user with 0 credits
      await User.findByIdAndUpdate(testUserId, { credits_remaining: 0 });

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Hello' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect(events[0].error).toContain('Insufficient credits');
    });

    it('should proceed when user has exactly minimum credits', async () => {
      await User.findByIdAndUpdate(testUserId, { credits_remaining: 1 });

      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Hello!' },
          { type: 'done', totalTokens: 10 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Hi there' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const userMessageEvent = events.find((e) => e.type === 'user_message');
      expect(userMessageEvent).toBeDefined();
    });

    it('should proceed when user has sufficient credits', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Response from agent' },
          { type: 'done', totalTokens: 50 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Test message' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents).toHaveLength(0);

      const userMsgEvent = events.find((e) => e.type === 'user_message');
      expect(userMsgEvent).toBeDefined();
    });
  });

  describe('Collaborative Mode', () => {
    it('should orchestrate S1 then S2 sequential responses', async () => {
      let callCount = 0;
      mockGenerateStream.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockStream([
            { type: 'text', content: 'Flash response' },
            { type: 'done', totalTokens: 20 },
          ])();
        } else {
          return createMockStream([
            { type: 'text', content: 'Sage response' },
            { type: 'done', totalTokens: 30 },
          ])();
        }
      });

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'What is 2+2?' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      // Should have: user_message, agent_start, text, agent_done (x2), turn_complete, done
      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      expect(agentStartEvents).toHaveLength(2);
      expect(agentStartEvents[0].agentId).toBe('flash');
      expect(agentStartEvents[1].agentId).toBe('sage');

      const turnCompleteEvent = events.find((e) => e.type === 'turn_complete');
      expect(turnCompleteEvent).toBeDefined();
      expect(turnCompleteEvent!.turn).toBe(1);
    });

    it('should respect @mention for specific agent', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Sage only response' },
          { type: 'done', totalTokens: 25 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: '@sage analyze this problem' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      // When @sage is mentioned, only sage responds
      expect(agentStartEvents.length).toBeGreaterThanOrEqual(1);
      const sageStart = agentStartEvents.find((e) => e.agentId === 'sage');
      expect(sageStart).toBeDefined();
    });
  });

  describe('Parallel Mode', () => {
    it('should orchestrate S1 and S2 concurrently', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Parallel response' },
          { type: 'done', totalTokens: 15 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Quick question' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'parallel',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      // Both agents should have started
      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      expect(agentStartEvents).toHaveLength(2);

      const agentIds = agentStartEvents.map((e) => e.agentId);
      expect(agentIds).toContain('flash');
      expect(agentIds).toContain('sage');
    });
  });

  describe('Expert Council Mode', () => {
    it('should orchestrate all council members in parallel', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Expert opinion' },
          { type: 'done', totalTokens: 40 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Analyze this business case' },
        agentConfig: {
          system1Id: 'flash',
          system2Id: 'sage',
          councilIds: ['lawyer', 'economist', 'strategist'],
        },
        mode: 'expert-council',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      expect(agentStartEvents).toHaveLength(3);

      const agentIds = agentStartEvents.map((e) => e.agentId);
      expect(agentIds).toContain('lawyer');
      expect(agentIds).toContain('economist');
      expect(agentIds).toContain('strategist');
    });

    it('should use default council when councilIds not provided', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Default expert' },
          { type: 'done', totalTokens: 20 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Help me' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'expert-council',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      // Default council is lawyer and economist
      expect(agentStartEvents).toHaveLength(2);
    });
  });

  describe('Debate Mode', () => {
    it('should orchestrate Pro then Con then Moderator', async () => {
      let callCount = 0;
      mockGenerateStream.mockImplementation(() => {
        callCount++;
        return createMockStream([
          { type: 'text', content: `Debate response ${callCount}` },
          { type: 'done', totalTokens: 30 },
        ])();
      });

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Is AI good for humanity?' },
        agentConfig: {
          system1Id: 'flash',
          system2Id: 'sage',
          proponentId: 'debater_pro',
          opponentId: 'debater_con',
          moderatorId: 'moderator',
        },
        mode: 'debate',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      expect(agentStartEvents).toHaveLength(3);
      expect(agentStartEvents[0].agentId).toBe('debater_pro');
      expect(agentStartEvents[1].agentId).toBe('debater_con');
      expect(agentStartEvents[2].agentId).toBe('moderator');
    });

    it('should work without moderator', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Debate point' },
          { type: 'done', totalTokens: 25 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Debate topic' },
        agentConfig: {
          system1Id: 'flash',
          system2Id: 'sage',
          proponentId: 'debater_pro',
          opponentId: 'debater_con',
        },
        mode: 'debate',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const agentStartEvents = events.filter((e) => e.type === 'agent_start');
      expect(agentStartEvents).toHaveLength(2);
    });
  });

  describe('Stream Event Sequence', () => {
    it('should yield events in correct order', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Hello ' },
          { type: 'text', content: 'World!' },
          { type: 'done', totalTokens: 10 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Say hello' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      // First event should be user_message
      expect(events[0].type).toBe('user_message');
      expect(events[0].messageId).toBeDefined();

      // Last events should be turn_complete and done
      const lastEvents = events.slice(-2);
      expect(lastEvents[0].type).toBe('turn_complete');
      expect(lastEvents[1].type).toBe('done');
    });

    it('should accumulate text content correctly', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Part 1 ' },
          { type: 'text', content: 'Part 2 ' },
          { type: 'text', content: 'Part 3' },
          { type: 'done', totalTokens: 15 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Multi-part response' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const textEvents = events.filter((e) => e.type === 'text' && e.agentId === 'flash');
      expect(textEvents).toHaveLength(3);
      expect(textEvents[0].content).toBe('Part 1 ');
      expect(textEvents[1].content).toBe('Part 2 ');
      expect(textEvents[2].content).toBe('Part 3');
    });
  });

  describe('Provider Error Handling', () => {
    it('should handle provider error mid-stream', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Starting...' },
          { type: 'error', error: 'API rate limit exceeded' },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Test error handling' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const errorEvent = events.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.error).toBe('API rate limit exceeded');
    });

    it('should handle agent not found error', async () => {
      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Test' },
        agentConfig: { system1Id: 'nonexistent', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const errorEvent = events.find((e) => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent!.error).toContain('Agent not found');
    });
  });

  describe('Message Persistence', () => {
    it('should create user message in database', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Response' },
          { type: 'done', totalTokens: 10 },
        ])
      );

      const userContent = 'This is my message';
      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: userContent },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      await collectEvents(orchestrator);

      // Check that user message was saved
      const messages = await Message.find({ conversation_id: testConversationId });
      const userMsg = messages.find((m) => m.sender_type === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg!.content).toBe(userContent);
    });

    it('should create agent messages in database', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Agent says hello' },
          { type: 'done', totalTokens: 20 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Hi' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      await collectEvents(orchestrator);

      const messages = await Message.find({ conversation_id: testConversationId });
      const agentMsgs = messages.filter((m) => m.sender_type === 'agent');
      expect(agentMsgs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Credit Deduction and Usage Logging', () => {
    it('should deduct credits after agent response', async () => {
      const initialCredits = 100;
      await User.findByIdAndUpdate(testUserId, { credits_remaining: initialCredits });

      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Response' },
          { type: 'done', totalTokens: 100 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'Deduct my credits' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      await collectEvents(orchestrator);

      const updatedUser = await User.findById(testUserId);
      // Credits should be less than initial (cost = max(0.1, tokens * 0.001))
      expect(updatedUser!.credits_remaining).toBeLessThan(initialCredits);
    });
  });

  describe('Auto-Reply Loop', () => {
    it('should not auto-reply when enableAutoReply is false', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Single response' },
          { type: 'done', totalTokens: 10 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: 'One response only' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      const turnCompleteEvents = events.filter((e) => e.type === 'turn_complete');
      expect(turnCompleteEvents).toHaveLength(1);
      expect(turnCompleteEvents[0].turn).toBe(1);
    });

    // Note: Auto-reply tests with enableAutoReply=true would require longer timeouts
    // and more complex mocking due to the 1-second delay between turns
  });

  describe('Edge Cases', () => {
    it('should handle empty user message content gracefully', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Response to empty' },
          { type: 'done', totalTokens: 10 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: { content: '' },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      // Should still process (validation happens at API layer)
      const userMsgEvent = events.find((e) => e.type === 'user_message');
      expect(userMsgEvent).toBeDefined();
    });

    it('should handle attachments in user message', async () => {
      mockGenerateStream.mockImplementation(
        createMockStream([
          { type: 'text', content: 'Analyzed image' },
          { type: 'done', totalTokens: 50 },
        ])
      );

      const config: OrchestrationConfig = {
        conversationId: testConversationId,
        userId: testUserId,
        userMessage: {
          content: 'Analyze this image',
          attachments: [
            {
              id: 'att-1',
              type: 'image',
              mimeType: 'image/png',
              name: 'test.png',
              data: 'base64data',
            },
          ],
        },
        agentConfig: { system1Id: 'flash', system2Id: 'sage' },
        mode: 'collaborative',
        enableAutoReply: false,
        agents: testAgents,
      };

      const orchestrator = new OrchestrationService(config);
      const events = await collectEvents(orchestrator);

      // Should process normally with attachments
      expect(mockGenerateStream).toHaveBeenCalled();
      const lastCall = mockGenerateStream.mock.calls[0][0];
      expect(lastCall.attachments).toBeDefined();
    });
  });
});
