import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from '../../mocks/db';
import { ConversationService } from '@/lib/services/conversation.service';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { createTestConversation } from '../../mocks/factories/conversation.factory';
import { createTestMessage } from '../../mocks/factories/message.factory';

// Mock the connectDB to avoid connecting to real DB
vi.mock('@/lib/db/mongoose', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('ConversationService Integration Tests', () => {
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

  describe('list', () => {
    it('should return empty result for user with no conversations', async () => {
      const result = await ConversationService.list(testUserId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(0);
    });

    it('should return paginated conversations sorted by updatedAt desc', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create conversations with different update times
      const conv1 = await Conversation.create(
        createTestConversation({ user_id: userId, title: 'First' })
      );
      await new Promise((r) => setTimeout(r, 10)); // Small delay

      const conv2 = await Conversation.create(
        createTestConversation({ user_id: userId, title: 'Second' })
      );
      await new Promise((r) => setTimeout(r, 10));

      const conv3 = await Conversation.create(
        createTestConversation({ user_id: userId, title: 'Third' })
      );

      const result = await ConversationService.list(userId.toString(), { page: 1, limit: 20 });

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.data[0].title).toBe('Third'); // Most recent first
      expect(result.data[2].title).toBe('First'); // Oldest last
    });

    it('should only return conversations for the given userId', async () => {
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();

      await Conversation.create([
        createTestConversation({ user_id: user1Id, title: 'User 1 Conv' }),
        createTestConversation({ user_id: user2Id, title: 'User 2 Conv' }),
      ]);

      const result = await ConversationService.list(user1Id.toString(), { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('User 1 Conv');
    });

    it('should calculate pagination correctly', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create 5 conversations
      for (let i = 0; i < 5; i++) {
        await Conversation.create(
          createTestConversation({ user_id: userId, title: `Conv ${i}` })
        );
      }

      const page1 = await ConversationService.list(userId.toString(), { page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);

      const page2 = await ConversationService.list(userId.toString(), { page: 2, limit: 2 });
      expect(page2.data).toHaveLength(2);

      const page3 = await ConversationService.list(userId.toString(), { page: 3, limit: 2 });
      expect(page3.data).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create conversation with default values', async () => {
      const result = await ConversationService.create(testUserId, {});

      expect(result.title).toBe('New Chat');
      expect(result.mode).toBe('collaborative');
      expect(result.agentConfig.system1Id).toBe('flash');
      expect(result.agentConfig.system2Id).toBe('sage');
      expect(result.enableAutoReply).toBe(false);
      expect(result.settings.extendedDebate).toBe(false);
      expect(result.settings.autoScroll).toBe(true);
    });

    it('should create conversation with custom values', async () => {
      const result = await ConversationService.create(testUserId, {
        title: 'Custom Chat',
        mode: 'debate',
        agentConfig: {
          system1Id: 'proponent',
          system2Id: 'opponent',
          proponentId: 'proponent',
          opponentId: 'opponent',
          moderatorId: 'moderator',
        },
        enableAutoReply: true,
        settings: { extendedDebate: true, autoScroll: false },
      });

      expect(result.title).toBe('Custom Chat');
      expect(result.mode).toBe('debate');
      expect(result.agentConfig.proponentId).toBe('proponent');
      expect(result.enableAutoReply).toBe(true);
      expect(result.settings.extendedDebate).toBe(true);
    });

    it('should save conversation to database', async () => {
      const result = await ConversationService.create(testUserId, {
        title: 'Saved Chat',
      });

      const found = await Conversation.findById(result.id);
      expect(found).not.toBeNull();
      expect(found!.title).toBe('Saved Chat');
      expect(found!.user_id.toString()).toBe(testUserId);
    });
  });

  describe('getById', () => {
    it('should return null for invalid ObjectId', async () => {
      const result = await ConversationService.getById(testUserId, 'invalid-id');
      expect(result).toBeNull();
    });

    it('should return null if conversation not owned by user', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const conv = await Conversation.create(
        createTestConversation({ user_id: otherUserId, title: 'Other User Conv' })
      );

      const result = await ConversationService.getById(testUserId, conv._id.toString());
      expect(result).toBeNull();
    });

    it('should return conversation when owned by user', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({
          user_id: userId,
          title: 'My Conversation',
          mode: 'parallel',
        })
      );

      const result = await ConversationService.getById(testUserId, conv._id.toString());

      expect(result).not.toBeNull();
      expect(result!.id).toBe(conv._id.toString());
      expect(result!.title).toBe('My Conversation');
      expect(result!.mode).toBe('parallel');
    });
  });

  describe('update', () => {
    it('should return null for invalid ObjectId', async () => {
      const result = await ConversationService.update(testUserId, 'invalid-id', { title: 'New' });
      expect(result).toBeNull();
    });

    it('should return null if not owner', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const conv = await Conversation.create(
        createTestConversation({ user_id: otherUserId })
      );

      const result = await ConversationService.update(testUserId, conv._id.toString(), {
        title: 'Hacked',
      });
      expect(result).toBeNull();
    });

    it('should update only provided fields', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({
          user_id: userId,
          title: 'Original Title',
          mode: 'collaborative',
        })
      );

      const result = await ConversationService.update(testUserId, conv._id.toString(), {
        title: 'Updated Title',
      });

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated Title');
      expect(result!.mode).toBe('collaborative'); // Unchanged
    });

    it('should update multiple fields', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId })
      );

      const result = await ConversationService.update(testUserId, conv._id.toString(), {
        title: 'New Title',
        mode: 'debate',
        enableAutoReply: true,
        settings: { extendedDebate: true, autoScroll: false },
      });

      expect(result!.title).toBe('New Title');
      expect(result!.mode).toBe('debate');
      expect(result!.enableAutoReply).toBe(true);
      expect(result!.settings.extendedDebate).toBe(true);
    });
  });

  describe('delete', () => {
    it('should return false for invalid ObjectId', async () => {
      const result = await ConversationService.delete(testUserId, 'invalid-id');
      expect(result).toBe(false);
    });

    it('should return false if not owner', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const conv = await Conversation.create(
        createTestConversation({ user_id: otherUserId })
      );

      const result = await ConversationService.delete(testUserId, conv._id.toString());
      expect(result).toBe(false);

      // Verify not deleted
      const found = await Conversation.findById(conv._id);
      expect(found).not.toBeNull();
    });

    it('should delete conversation and return true', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId })
      );

      const result = await ConversationService.delete(testUserId, conv._id.toString());
      expect(result).toBe(true);

      // Verify deleted
      const found = await Conversation.findById(conv._id);
      expect(found).toBeNull();
    });

    it('should delete associated messages', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId })
      );

      // Create messages for this conversation
      await Message.create([
        createTestMessage({ conversation_id: conv._id, content: 'Msg 1' }),
        createTestMessage({ conversation_id: conv._id, content: 'Msg 2' }),
      ]);

      // Verify messages exist
      const messagesBefore = await Message.countDocuments({ conversation_id: conv._id });
      expect(messagesBefore).toBe(2);

      // Delete conversation
      await ConversationService.delete(testUserId, conv._id.toString());

      // Verify messages deleted
      const messagesAfter = await Message.countDocuments({ conversation_id: conv._id });
      expect(messagesAfter).toBe(0);
    });
  });

  describe('updatePreview', () => {
    it('should update preview text', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId, preview: 'Old preview' })
      );

      await ConversationService.updatePreview(conv._id.toString(), 'New preview');

      const updated = await Conversation.findById(conv._id);
      expect(updated!.preview).toBe('New preview');
    });

    it('should truncate preview to 100 characters with ellipsis', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId })
      );

      const longText = 'a'.repeat(150);
      await ConversationService.updatePreview(conv._id.toString(), longText);

      const updated = await Conversation.findById(conv._id);
      expect(updated!.preview).toBe('a'.repeat(100) + '...');
      expect(updated!.preview.length).toBe(103);
    });

    it('should not add ellipsis for short text', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId })
      );

      await ConversationService.updatePreview(conv._id.toString(), 'Short text');

      const updated = await Conversation.findById(conv._id);
      expect(updated!.preview).toBe('Short text');
    });
  });

  describe('isOwner', () => {
    it('should return false for invalid ObjectId', async () => {
      const result = await ConversationService.isOwner(testUserId, 'invalid-id');
      expect(result).toBe(false);
    });

    it('should return false if not owner', async () => {
      const otherUserId = new mongoose.Types.ObjectId();
      const conv = await Conversation.create(
        createTestConversation({ user_id: otherUserId })
      );

      const result = await ConversationService.isOwner(testUserId, conv._id.toString());
      expect(result).toBe(false);
    });

    it('should return true if owner', async () => {
      const userId = new mongoose.Types.ObjectId(testUserId);
      const conv = await Conversation.create(
        createTestConversation({ user_id: userId })
      );

      const result = await ConversationService.isOwner(testUserId, conv._id.toString());
      expect(result).toBe(true);
    });

    it('should return false for non-existent conversation', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await ConversationService.isOwner(testUserId, nonExistentId);
      expect(result).toBe(false);
    });
  });
});
