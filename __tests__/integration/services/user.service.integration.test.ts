import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from '../../mocks/db';
import { UserService } from '@/lib/services/user.service';
import User from '@/lib/db/models/User';
import UsageLog from '@/lib/db/models/UsageLog';
import { createTestUser } from '../../mocks/factories/user.factory';

// Mock the connectDB to avoid connecting to real DB
vi.mock('@/lib/db/mongoose', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('UserService Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  describe('getProfile', () => {
    it('should return null for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await UserService.getProfile(fakeId);
      expect(result).toBeNull();
    });

    it('should return user profile for existing user', async () => {
      const userData = createTestUser({
        name: 'Test User',
        email: 'test@example.com',
        credits_remaining: 150,
        subscription_tier: 'pro',
        role: 'user',
        is_banned: false,
      });

      const savedUser = await User.create(userData);

      const result = await UserService.getProfile(savedUser._id.toString());

      expect(result).not.toBeNull();
      expect(result!.id).toBe(savedUser._id.toString());
      expect(result!.name).toBe('Test User');
      expect(result!.email).toBe('test@example.com');
      expect(result!.credits_remaining).toBe(150);
      expect(result!.subscription_tier).toBe('pro');
      expect(result!.role).toBe('user');
      expect(result!.is_banned).toBe(false);
    });

    it('should return user with optional image field', async () => {
      const userData = createTestUser({
        name: 'User With Avatar',
        email: 'avatar@example.com',
        image: 'https://example.com/avatar.png',
      });

      const savedUser = await User.create(userData);
      const result = await UserService.getProfile(savedUser._id.toString());

      expect(result).not.toBeNull();
      expect(result!.image).toBe('https://example.com/avatar.png');
    });
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      const userData = createTestUser({
        name: 'Original Name',
        email: 'original@example.com',
      });
      const savedUser = await User.create(userData);

      const result = await UserService.updateProfile(savedUser._id.toString(), {
        name: 'Updated Name',
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Name');
      expect(result!.email).toBe('original@example.com'); // unchanged
    });

    it('should update user email and lowercase it', async () => {
      const userData = createTestUser({
        name: 'Test User',
        email: 'old@example.com',
      });
      const savedUser = await User.create(userData);

      const result = await UserService.updateProfile(savedUser._id.toString(), {
        email: 'NEW@EXAMPLE.COM',
      });

      expect(result).not.toBeNull();
      expect(result!.email).toBe('new@example.com');
    });

    it('should throw error if email is already in use by another user', async () => {
      const user1 = await User.create(
        createTestUser({ email: 'user1@example.com' })
      );
      const user2 = await User.create(
        createTestUser({ email: 'user2@example.com' })
      );

      await expect(
        UserService.updateProfile(user2._id.toString(), {
          email: 'user1@example.com',
        })
      ).rejects.toThrow('Email already in use');
    });

    it('should allow updating email to same value (case-insensitive)', async () => {
      const savedUser = await User.create(
        createTestUser({ email: 'same@example.com' })
      );

      // This should not throw - updating to same email
      const result = await UserService.updateProfile(savedUser._id.toString(), {
        email: 'SAME@example.com',
      });

      expect(result).not.toBeNull();
      expect(result!.email).toBe('same@example.com');
    });

    it('should return null for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await UserService.updateProfile(fakeId, { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should update both name and email', async () => {
      const savedUser = await User.create(
        createTestUser({ name: 'Old Name', email: 'old@example.com' })
      );

      const result = await UserService.updateProfile(savedUser._id.toString(), {
        name: 'New Name',
        email: 'new@example.com',
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('New Name');
      expect(result!.email).toBe('new@example.com');
    });
  });

  describe('getCreditsAndUsage', () => {
    it('should return null for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await UserService.getCreditsAndUsage(fakeId);
      expect(result).toBeNull();
    });

    it('should return credits info with zero usage when no logs exist', async () => {
      const savedUser = await User.create(
        createTestUser({
          credits_remaining: 100,
          subscription_tier: 'free',
          subscription_status: 'active',
          cancel_at_period_end: false,
        })
      );

      const result = await UserService.getCreditsAndUsage(savedUser._id.toString());

      expect(result).not.toBeNull();
      expect(result!.credits_remaining).toBe(100);
      expect(result!.subscription_tier).toBe('free');
      expect(result!.subscription_status).toBe('active');
      expect(result!.cancel_at_period_end).toBe(false);
      expect(result!.recentUsage).toEqual({
        total_tokens: 0,
        total_cost: 0,
        count: 0,
      });
    });

    it('should aggregate usage from last 30 days', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 50 })
      );
      const userId = savedUser._id;

      // Create usage logs within last 30 days
      await UsageLog.create([
        {
          user_id: userId,
          tokens_used: 100,
          cost: 0.01,
          agent_id: 'flash',
        },
        {
          user_id: userId,
          tokens_used: 200,
          cost: 0.02,
          agent_id: 'sage',
        },
        {
          user_id: userId,
          tokens_used: 300,
          cost: 0.03,
          agent_id: 'flash',
        },
      ]);

      const result = await UserService.getCreditsAndUsage(userId.toString());

      expect(result).not.toBeNull();
      expect(result!.recentUsage.total_tokens).toBe(600);
      expect(result!.recentUsage.total_cost).toBe(0.06);
      expect(result!.recentUsage.count).toBe(3);
    });

    it('should not include usage logs older than 30 days', async () => {
      const savedUser = await User.create(createTestUser());
      const userId = savedUser._id;

      // Create old usage log (40 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);

      await UsageLog.create({
        user_id: userId,
        tokens_used: 1000,
        cost: 1.0,
        agent_id: 'flash',
        createdAt: oldDate,
      });

      // Create recent usage log
      await UsageLog.create({
        user_id: userId,
        tokens_used: 100,
        cost: 0.01,
        agent_id: 'sage',
      });

      const result = await UserService.getCreditsAndUsage(userId.toString());

      expect(result).not.toBeNull();
      expect(result!.recentUsage.total_tokens).toBe(100);
      expect(result!.recentUsage.count).toBe(1);
    });

    it('should return subscription period end when set', async () => {
      const periodEnd = new Date('2025-02-01');
      const savedUser = await User.create(
        createTestUser({
          subscription_tier: 'pro',
          current_period_end: periodEnd,
        })
      );

      const result = await UserService.getCreditsAndUsage(savedUser._id.toString());

      expect(result).not.toBeNull();
      expect(result!.current_period_end).toEqual(periodEnd);
    });
  });

  describe('deductCredits', () => {
    it('should return false if user has insufficient credits', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 10 })
      );

      const result = await UserService.deductCredits(savedUser._id.toString(), 20);

      expect(result).toBe(false);

      // Verify credits unchanged
      const updatedUser = await User.findById(savedUser._id);
      expect(updatedUser!.credits_remaining).toBe(10);
    });

    it('should deduct credits and return true on success', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 100 })
      );

      const result = await UserService.deductCredits(savedUser._id.toString(), 30);

      expect(result).toBe(true);

      // Verify credits deducted
      const updatedUser = await User.findById(savedUser._id);
      expect(updatedUser!.credits_remaining).toBe(70);
    });

    it('should handle exact credit amount', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 50 })
      );

      const result = await UserService.deductCredits(savedUser._id.toString(), 50);

      expect(result).toBe(true);

      const updatedUser = await User.findById(savedUser._id);
      expect(updatedUser!.credits_remaining).toBe(0);
    });

    it('should return false for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await UserService.deductCredits(fakeId, 10);
      expect(result).toBe(false);
    });

    it('should handle concurrent deductions atomically', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 100 })
      );
      const userId = savedUser._id.toString();

      // Attempt 3 concurrent deductions of 40 credits each
      // Only 2 should succeed (100 - 40 - 40 = 20, third one fails)
      const results = await Promise.all([
        UserService.deductCredits(userId, 40),
        UserService.deductCredits(userId, 40),
        UserService.deductCredits(userId, 40),
      ]);

      const successCount = results.filter((r) => r === true).length;
      expect(successCount).toBe(2);

      const updatedUser = await User.findById(savedUser._id);
      expect(updatedUser!.credits_remaining).toBe(20);
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return false for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await UserService.hasEnoughCredits(fakeId, 10);
      expect(result).toBe(false);
    });

    it('should return false when credits are below amount', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 10 })
      );

      const result = await UserService.hasEnoughCredits(savedUser._id.toString(), 20);
      expect(result).toBe(false);
    });

    it('should return true when credits meet amount', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 50 })
      );

      const result = await UserService.hasEnoughCredits(savedUser._id.toString(), 50);
      expect(result).toBe(true);
    });

    it('should return true when credits exceed amount', async () => {
      const savedUser = await User.create(
        createTestUser({ credits_remaining: 100 })
      );

      const result = await UserService.hasEnoughCredits(savedUser._id.toString(), 50);
      expect(result).toBe(true);
    });
  });

  describe('logUsage', () => {
    it('should create usage log with all fields', async () => {
      const savedUser = await User.create(createTestUser());
      const conversationId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      await UserService.logUsage({
        userId: savedUser._id.toString(),
        conversationId,
        messageId,
        agentId: 'flash',
        tokensUsed: 150,
        cost: 0.015,
        modelName: 'gemini-2.0-flash',
      });

      const logs = await UsageLog.find({
        user_id: savedUser._id,
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].tokens_used).toBe(150);
      expect(logs[0].cost).toBe(0.015);
      expect(logs[0].agent_id).toBe('flash');
      expect(logs[0].modelName).toBe('gemini-2.0-flash');
      expect(logs[0].conversation_id!.toString()).toBe(conversationId);
      expect(logs[0].message_id!.toString()).toBe(messageId);
    });

    it('should create multiple usage logs for same user', async () => {
      const savedUser = await User.create(createTestUser());
      const userId = savedUser._id.toString();
      const conversationId = new mongoose.Types.ObjectId().toString();

      await UserService.logUsage({
        userId,
        conversationId,
        messageId: new mongoose.Types.ObjectId().toString(),
        agentId: 'flash',
        tokensUsed: 100,
        cost: 0.01,
        modelName: 'gemini-2.0-flash',
      });

      await UserService.logUsage({
        userId,
        conversationId,
        messageId: new mongoose.Types.ObjectId().toString(),
        agentId: 'sage',
        tokensUsed: 200,
        cost: 0.02,
        modelName: 'gemini-2.0-flash',
      });

      const logs = await UsageLog.find({ user_id: savedUser._id });
      expect(logs).toHaveLength(2);
    });
  });
});
