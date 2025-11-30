import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from '../../mocks/db';
import { AdminService } from '@/lib/services/admin.service';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import UsageLog from '@/lib/db/models/UsageLog';
import { createTestUser } from '../../mocks/factories/user.factory';
import { createTestConversation } from '../../mocks/factories/conversation.factory';
import { createTestMessage } from '../../mocks/factories/message.factory';

// Mock the connectDB to avoid connecting to real DB
vi.mock('@/lib/db/mongoose', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('AdminService Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  describe('getStats', () => {
    it('should return all zeros for empty system', async () => {
      const stats = await AdminService.getStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.totalConversations).toBe(0);
      expect(stats.totalMessages).toBe(0);
      expect(stats.totalCreditsDistributed).toBe(0);
      expect(stats.totalTokensUsed).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.usersByTier).toEqual({ free: 0, basic: 0, pro: 0 });
      expect(stats.usersByRole).toEqual({ user: 0, admin: 0 });
    });

    it('should count users correctly', async () => {
      await User.create([
        createTestUser({ email: 'user1@test.com' }),
        createTestUser({ email: 'user2@test.com' }),
        createTestUser({ email: 'user3@test.com' }),
      ]);

      const stats = await AdminService.getStats();
      expect(stats.totalUsers).toBe(3);
    });

    it('should count conversations and messages', async () => {
      const user = await User.create(createTestUser());
      const conv = await Conversation.create(createTestConversation({ user_id: user._id }));

      await Message.create([
        createTestMessage({ conversation_id: conv._id, sender_id: user._id.toString() }),
        createTestMessage({ conversation_id: conv._id, sender_id: user._id.toString() }),
      ]);

      const stats = await AdminService.getStats();
      expect(stats.totalConversations).toBe(1);
      expect(stats.totalMessages).toBe(2);
    });

    it('should aggregate usage stats', async () => {
      const user = await User.create(createTestUser());

      await UsageLog.create([
        { user_id: user._id, tokens_used: 100, cost: 0.01, agent_id: 'flash' },
        { user_id: user._id, tokens_used: 200, cost: 0.02, agent_id: 'sage' },
        { user_id: user._id, tokens_used: 300, cost: 0.03, agent_id: 'flash' },
      ]);

      const stats = await AdminService.getStats();
      expect(stats.totalTokensUsed).toBe(600);
      expect(stats.totalCost).toBeCloseTo(0.06, 5);
    });

    it('should sum credits from all users', async () => {
      await User.create([
        createTestUser({ email: 'u1@test.com', credits_remaining: 100 }),
        createTestUser({ email: 'u2@test.com', credits_remaining: 200 }),
        createTestUser({ email: 'u3@test.com', credits_remaining: 300 }),
      ]);

      const stats = await AdminService.getStats();
      expect(stats.totalCreditsDistributed).toBe(600);
    });

    it('should count users by tier', async () => {
      await User.create([
        createTestUser({ email: 'free1@test.com', subscription_tier: 'free' }),
        createTestUser({ email: 'free2@test.com', subscription_tier: 'free' }),
        createTestUser({ email: 'basic1@test.com', subscription_tier: 'basic' }),
        createTestUser({ email: 'pro1@test.com', subscription_tier: 'pro' }),
        createTestUser({ email: 'pro2@test.com', subscription_tier: 'pro' }),
        createTestUser({ email: 'pro3@test.com', subscription_tier: 'pro' }),
      ]);

      const stats = await AdminService.getStats();
      expect(stats.usersByTier).toEqual({ free: 2, basic: 1, pro: 3 });
    });

    it('should count users by role', async () => {
      await User.create([
        createTestUser({ email: 'u1@test.com', role: 'user' }),
        createTestUser({ email: 'u2@test.com', role: 'user' }),
        createTestUser({ email: 'u3@test.com', role: 'user' }),
        createTestUser({ email: 'admin1@test.com', role: 'admin' }),
      ]);

      const stats = await AdminService.getStats();
      expect(stats.usersByRole).toEqual({ user: 3, admin: 1 });
    });
  });

  describe('listUsers', () => {
    beforeEach(async () => {
      // Create 25 users for pagination testing
      const users = [];
      for (let i = 0; i < 25; i++) {
        users.push(
          createTestUser({
            email: `user${i.toString().padStart(2, '0')}@test.com`,
            name: `User ${i}`,
            subscription_tier: i < 10 ? 'free' : i < 20 ? 'basic' : 'pro',
            role: i === 0 ? 'admin' : 'user',
          })
        );
      }
      await User.create(users);
    });

    it('should return paginated users with default pagination', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 20 },
        {}
      );

      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('should return second page correctly', async () => {
      const result = await AdminService.listUsers(
        { page: 2, limit: 20 },
        {}
      );

      expect(result.data).toHaveLength(5);
      expect(result.page).toBe(2);
    });

    it('should return empty for page out of range', async () => {
      const result = await AdminService.listUsers(
        { page: 5, limit: 20 },
        {}
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(25);
    });

    it('should filter by search on name', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 100 },
        { search: 'User 1' }
      );

      // "User 1", "User 10", "User 11", ..., "User 19"
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach((user) => {
        expect(user.name.toLowerCase()).toContain('user 1');
      });
    });

    it('should filter by search on email (case-insensitive)', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 100 },
        { search: 'USER00@TEST.COM' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('user00@test.com');
    });

    it('should filter by role', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 100 },
        { role: 'admin' }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].role).toBe('admin');
    });

    it('should filter by tier', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 100 },
        { tier: 'pro' }
      );

      expect(result.data).toHaveLength(5);
      result.data.forEach((user) => {
        expect(user.subscription_tier).toBe('pro');
      });
    });

    it('should apply multiple filters', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 100 },
        { tier: 'free', role: 'user' }
      );

      expect(result.data).toHaveLength(9); // 10 free users, 1 is admin
      result.data.forEach((user) => {
        expect(user.subscription_tier).toBe('free');
        expect(user.role).toBe('user');
      });
    });

    it('should return empty for non-matching filters', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 100 },
        { search: 'nonexistent@email.com' }
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should sort by createdAt descending', async () => {
      const result = await AdminService.listUsers(
        { page: 1, limit: 10 },
        {}
      );

      for (let i = 0; i < result.data.length - 1; i++) {
        const current = new Date(result.data[i].createdAt).getTime();
        const next = new Date(result.data[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getUserById', () => {
    it('should return user by valid ID', async () => {
      const created = await User.create(
        createTestUser({
          name: 'Test User',
          email: 'test@example.com',
          credits_remaining: 500,
          subscription_tier: 'pro',
        })
      );

      const result = await AdminService.getUserById(created._id.toString());

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created._id.toString());
      expect(result!.name).toBe('Test User');
      expect(result!.email).toBe('test@example.com');
      expect(result!.credits_remaining).toBe(500);
      expect(result!.subscription_tier).toBe('pro');
    });

    it('should return null for invalid ObjectId format', async () => {
      const result = await AdminService.getUserById('invalid-id');
      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await AdminService.getUserById(fakeId);
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await User.create(
        createTestUser({
          name: 'Original User',
          credits_remaining: 100,
          subscription_tier: 'free',
          role: 'user',
          is_banned: false,
        })
      );
      userId = user._id.toString();
    });

    it('should update credits_remaining', async () => {
      const result = await AdminService.updateUser(userId, {
        credits_remaining: 500,
      });

      expect(result).not.toBeNull();
      expect(result!.credits_remaining).toBe(500);

      // Verify in DB
      const dbUser = await User.findById(userId);
      expect(dbUser!.credits_remaining).toBe(500);
    });

    it('should update subscription_tier', async () => {
      const result = await AdminService.updateUser(userId, {
        subscription_tier: 'pro',
      });

      expect(result).not.toBeNull();
      expect(result!.subscription_tier).toBe('pro');
    });

    it('should update role', async () => {
      const result = await AdminService.updateUser(userId, {
        role: 'admin',
      });

      expect(result).not.toBeNull();
      expect(result!.role).toBe('admin');
    });

    it('should update is_banned', async () => {
      const result = await AdminService.updateUser(userId, {
        is_banned: true,
      });

      expect(result).not.toBeNull();
      expect(result!.is_banned).toBe(true);
    });

    it('should update multiple fields', async () => {
      const result = await AdminService.updateUser(userId, {
        credits_remaining: 1000,
        subscription_tier: 'basic',
        role: 'admin',
        is_banned: false,
      });

      expect(result).not.toBeNull();
      expect(result!.credits_remaining).toBe(1000);
      expect(result!.subscription_tier).toBe('basic');
      expect(result!.role).toBe('admin');
      expect(result!.is_banned).toBe(false);
    });

    it('should return null for invalid ObjectId', async () => {
      const result = await AdminService.updateUser('invalid-id', {
        credits_remaining: 999,
      });
      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await AdminService.updateUser(fakeId, {
        credits_remaining: 999,
      });
      expect(result).toBeNull();
    });

    it('should only update provided fields', async () => {
      const result = await AdminService.updateUser(userId, {
        credits_remaining: 999,
      });

      expect(result).not.toBeNull();
      expect(result!.credits_remaining).toBe(999);
      expect(result!.subscription_tier).toBe('free'); // Unchanged
      expect(result!.role).toBe('user'); // Unchanged
    });
  });

  describe('getUsageLogs', () => {
    let userId1: string;
    let userId2: string;

    beforeEach(async () => {
      const user1 = await User.create(createTestUser({ email: 'u1@test.com' }));
      const user2 = await User.create(createTestUser({ email: 'u2@test.com' }));
      userId1 = user1._id.toString();
      userId2 = user2._id.toString();

      // Create 15 logs for user1 and 5 for user2
      const logs = [];
      for (let i = 0; i < 15; i++) {
        logs.push({
          user_id: user1._id,
          tokens_used: 100 + i,
          cost: 0.01 + i * 0.001,
          agent_id: 'flash',
          createdAt: new Date(Date.now() - i * 60000), // Each log 1 minute apart
        });
      }
      for (let i = 0; i < 5; i++) {
        logs.push({
          user_id: user2._id,
          tokens_used: 50 + i,
          cost: 0.005 + i * 0.001,
          agent_id: 'sage',
        });
      }
      await UsageLog.create(logs);
    });

    it('should return paginated logs', async () => {
      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 10 },
        {}
      );

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(20);
      expect(result.totalPages).toBe(2);
    });

    it('should filter by userId', async () => {
      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 100 },
        { userId: userId1 }
      );

      expect(result.data).toHaveLength(15);
      result.data.forEach((log) => {
        expect(log.user_id).toBe(userId1);
      });
    });

    it('should return empty for invalid userId format', async () => {
      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 100 },
        { userId: 'invalid-id' }
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by date range (from)', async () => {
      const fromDate = new Date(Date.now() - 10 * 60000).toISOString(); // 10 minutes ago

      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 100 },
        { from: fromDate }
      );

      result.data.forEach((log) => {
        expect(new Date(log.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(fromDate).getTime());
      });
    });

    it('should filter by date range (to)', async () => {
      const toDate = new Date(Date.now() - 5 * 60000).toISOString(); // 5 minutes ago

      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 100 },
        { to: toDate }
      );

      result.data.forEach((log) => {
        expect(new Date(log.createdAt).getTime()).toBeLessThanOrEqual(new Date(toDate).getTime());
      });
    });

    it('should filter by date range (both from and to)', async () => {
      const fromDate = new Date(Date.now() - 10 * 60000).toISOString();
      const toDate = new Date(Date.now() - 5 * 60000).toISOString();

      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 100 },
        { from: fromDate, to: toDate }
      );

      result.data.forEach((log) => {
        const logTime = new Date(log.createdAt).getTime();
        expect(logTime).toBeGreaterThanOrEqual(new Date(fromDate).getTime());
        expect(logTime).toBeLessThanOrEqual(new Date(toDate).getTime());
      });
    });

    it('should sort by createdAt descending', async () => {
      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 20 },
        {}
      );

      for (let i = 0; i < result.data.length - 1; i++) {
        const current = new Date(result.data[i].createdAt).getTime();
        const next = new Date(result.data[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should include all log fields', async () => {
      const result = await AdminService.getUsageLogs(
        { page: 1, limit: 1 },
        { userId: userId1 }
      );

      expect(result.data).toHaveLength(1);
      const log = result.data[0];
      expect(log.id).toBeDefined();
      expect(log.user_id).toBe(userId1);
      expect(log.tokens_used).toBeDefined();
      expect(log.cost).toBeDefined();
      expect(log.agent_id).toBe('flash');
      expect(log.createdAt).toBeDefined();
    });
  });
});
