import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from '../../mocks/db';
import { MessageService } from '@/lib/services/message.service';
import Message from '@/lib/db/models/Message';
import Conversation from '@/lib/db/models/Conversation';
import { createTestMessage, createAgentMessage } from '../../mocks/factories/message.factory';
import { createTestConversation } from '../../mocks/factories/conversation.factory';

// Mock the connectDB
vi.mock('@/lib/db/mongoose', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('MessageService Integration Tests', () => {
  let testConversationId: string;
  let testUserId: string;

  beforeAll(async () => {
    await setupTestDB();
    testUserId = new mongoose.Types.ObjectId().toString();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  beforeEach(async () => {
    // Create a conversation for message tests
    const conv = await Conversation.create(
      createTestConversation({ user_id: new mongoose.Types.ObjectId(testUserId) })
    );
    testConversationId = conv._id.toString();
  });

  describe('list', () => {
    it('should return empty result for invalid conversationId', async () => {
      const result = await MessageService.list('invalid-id', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should return empty result for conversation with no messages', async () => {
      const result = await MessageService.list(testConversationId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return messages sorted by createdAt asc (default)', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);

      // Create messages with delays
      await Message.create(createTestMessage({ conversation_id: convId, content: 'First' }));
      await new Promise((r) => setTimeout(r, 10));
      await Message.create(createTestMessage({ conversation_id: convId, content: 'Second' }));
      await new Promise((r) => setTimeout(r, 10));
      await Message.create(createTestMessage({ conversation_id: convId, content: 'Third' }));

      const result = await MessageService.list(testConversationId, { page: 1, limit: 20 }, 'asc');

      expect(result.data).toHaveLength(3);
      expect(result.data[0].content).toBe('First');
      expect(result.data[2].content).toBe('Third');
    });

    it('should return messages sorted by createdAt desc when specified', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);

      await Message.create(createTestMessage({ conversation_id: convId, content: 'First' }));
      await new Promise((r) => setTimeout(r, 10));
      await Message.create(createTestMessage({ conversation_id: convId, content: 'Second' }));

      const result = await MessageService.list(testConversationId, { page: 1, limit: 20 }, 'desc');

      expect(result.data[0].content).toBe('Second');
      expect(result.data[1].content).toBe('First');
    });

    it('should paginate correctly', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);

      // Create 5 messages
      for (let i = 0; i < 5; i++) {
        await Message.create(createTestMessage({ conversation_id: convId, content: `Msg ${i}` }));
      }

      const page1 = await MessageService.list(testConversationId, { page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);

      const page2 = await MessageService.list(testConversationId, { page: 2, limit: 2 });
      expect(page2.data).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should create user message', async () => {
      const result = await MessageService.create(testConversationId, testUserId, {
        content: 'Hello, world!',
      });

      expect(result.sender_type).toBe('user');
      expect(result.sender_id).toBe(testUserId);
      expect(result.content).toBe('Hello, world!');
      expect(result.conversation_id).toBe(testConversationId);
    });

    it('should create message with attachments', async () => {
      const result = await MessageService.create(testConversationId, testUserId, {
        content: 'Check this image',
        attachments: [
          { type: 'image', mimeType: 'image/png', name: 'test.png', url: 'data:...' },
        ],
      });

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments![0].type).toBe('image');
    });

    it('should update conversation preview', async () => {
      await MessageService.create(testConversationId, testUserId, {
        content: 'This is my message',
      });

      const conv = await Conversation.findById(testConversationId);
      expect(conv!.preview).toBe('This is my message');
    });
  });

  describe('createAgentMessage', () => {
    it('should create agent message', async () => {
      const result = await MessageService.createAgentMessage(
        testConversationId,
        'flash',
        'Hello from Flash!'
      );

      expect(result.sender_type).toBe('agent');
      expect(result.sender_id).toBe('flash');
      expect(result.content).toBe('Hello from Flash!');
    });

    it('should create agent message with relatedToMessageId', async () => {
      const userMsg = await MessageService.create(testConversationId, testUserId, {
        content: 'Question',
      });

      const result = await MessageService.createAgentMessage(
        testConversationId,
        'sage',
        'Answer',
        { relatedToMessageId: userMsg.id }
      );

      expect(result.metadata?.relatedToMessageId).toBe(userMsg.id);
    });

    it('should create agent message with cost', async () => {
      const result = await MessageService.createAgentMessage(
        testConversationId,
        'flash',
        'Response',
        { cost: 0.015 }
      );

      expect(result.cost).toBe(0.015);
    });
  });

  describe('updateContent', () => {
    it('should update message content', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(
        createTestMessage({ conversation_id: convId, content: 'Original' })
      );

      await MessageService.updateContent(msg._id.toString(), 'Updated content');

      const updated = await Message.findById(msg._id);
      expect(updated!.content).toBe('Updated content');
    });
  });

  describe('updateFeedback', () => {
    it('should return null for invalid messageId', async () => {
      const result = await MessageService.updateFeedback('invalid-id', 'up');
      expect(result).toBeNull();
    });

    it('should set feedback to up', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(createAgentMessage({ conversation_id: convId }));

      const result = await MessageService.updateFeedback(msg._id.toString(), 'up');

      expect(result).not.toBeNull();
      expect(result!.feedback).toBe('up');
    });

    it('should set feedback to down', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(createAgentMessage({ conversation_id: convId }));

      const result = await MessageService.updateFeedback(msg._id.toString(), 'down');

      expect(result!.feedback).toBe('down');
    });

    it('should remove feedback when null', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(
        createAgentMessage({ conversation_id: convId, feedback: 'up' })
      );

      const result = await MessageService.updateFeedback(msg._id.toString(), null);

      expect(result).not.toBeNull();
      expect(result!.feedback).toBeUndefined();
    });

    it('should return null for non-existent message', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await MessageService.updateFeedback(nonExistentId, 'up');
      expect(result).toBeNull();
    });
  });

  describe('togglePin', () => {
    it('should return null for invalid messageId', async () => {
      const result = await MessageService.togglePin('invalid-id');
      expect(result).toBeNull();
    });

    it('should pin unpinned message', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(
        createTestMessage({ conversation_id: convId, isPinned: false })
      );

      const result = await MessageService.togglePin(msg._id.toString());

      expect(result).not.toBeNull();
      expect(result!.isPinned).toBe(true);
    });

    it('should unpin pinned message', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(
        createTestMessage({ conversation_id: convId, isPinned: true })
      );

      const result = await MessageService.togglePin(msg._id.toString());

      expect(result!.isPinned).toBe(false);
    });

    it('should return null for non-existent message', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await MessageService.togglePin(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return null for invalid messageId', async () => {
      const result = await MessageService.getById('invalid-id');
      expect(result).toBeNull();
    });

    it('should return message by ID', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(
        createTestMessage({ conversation_id: convId, content: 'Find me' })
      );

      const result = await MessageService.getById(msg._id.toString());

      expect(result).not.toBeNull();
      expect(result!.content).toBe('Find me');
      expect(result!.id).toBe(msg._id.toString());
    });

    it('should return null for non-existent message', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await MessageService.getById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('getConversationId', () => {
    it('should return null for invalid messageId', async () => {
      const result = await MessageService.getConversationId('invalid-id');
      expect(result).toBeNull();
    });

    it('should return conversation ID for message', async () => {
      const convId = new mongoose.Types.ObjectId(testConversationId);
      const msg = await Message.create(createTestMessage({ conversation_id: convId }));

      const result = await MessageService.getConversationId(msg._id.toString());

      expect(result).toBe(testConversationId);
    });

    it('should return null for non-existent message', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await MessageService.getConversationId(nonExistentId);
      expect(result).toBeNull();
    });
  });
});
