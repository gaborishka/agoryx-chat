import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock connectDB
vi.mock('@/lib/db/mongoose', () => ({
  connectDB: vi.fn(),
}));

// Mock User model
vi.mock('@/lib/db/models/User', () => ({
  default: {
    findOneAndUpdate: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import User from '@/lib/db/models/User';

import { POST as checkoutPost } from '@/app/api/billing/checkout/route';
import { POST as portalPost } from '@/app/api/billing/portal/route';
import { GET as historyGet } from '@/app/api/billing/history/route';
import { PATCH as subscriptionPatch, DELETE as subscriptionDelete } from '@/app/api/billing/subscription/route';

const mockGetServerSession = vi.mocked(getServerSession);
const mockUserFindOneAndUpdate = vi.mocked(User.findOneAndUpdate);

const mockSession = {
  user: {
    email: 'test@example.com',
    name: 'Test User',
    id: 'user-123',
  },
};

describe('Billing API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/billing/checkout', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await checkoutPost(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid tier', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'enterprise' }),
      });

      const response = await checkoutPost(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid tier');
    });

    it('should return 400 when tier is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await checkoutPost(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid tier');
    });

    it('should create checkout session for basic tier', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'basic' }),
      });

      const response = await checkoutPost(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.url).toBe('/dashboard?checkout=basic&status=success');
      expect(body.sessionId).toMatch(/^cs_mock_/);
    });

    it('should create checkout session for pro tier', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await checkoutPost(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.url).toBe('/dashboard?checkout=pro&status=success');
      expect(body.sessionId).toMatch(/^cs_mock_/);
    });

    it('should return 500 for invalid JSON body', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await checkoutPost(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to create checkout session');
    });
  });

  describe('POST /api/billing/portal', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await portalPost();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 when session has no email', async () => {
      mockGetServerSession.mockResolvedValue({ user: { name: 'Test' } });

      const response = await portalPost();

      expect(response.status).toBe(401);
    });

    it('should create portal session successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const response = await portalPost();

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.url).toBe('/dashboard?portal=true');
      expect(body.sessionId).toMatch(/^ps_mock_/);
    });
  });

  describe('GET /api/billing/history', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await historyGet();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return billing history successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const response = await historyGet();

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.history).toHaveLength(3);
      expect(body.total).toBe(3);
      expect(body.history[0]).toMatchObject({
        id: 'inv_1',
        amount: 29.99,
        status: 'paid',
      });
    });
  });

  describe('PATCH /api/billing/subscription', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid tier', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'enterprise' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid tier');
    });

    it('should return 400 when tier is missing', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid tier');
    });

    it('should update subscription to pro tier with 500 credits', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockResolvedValue({
        subscription_tier: 'pro',
        credits_remaining: 600,
      });

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.subscription_tier).toBe('pro');

      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({
          subscription_tier: 'pro',
          subscription_status: 'active',
          $inc: { credits_remaining: 500 },
        }),
        { new: true }
      );
    });

    it('should update subscription to basic tier with 100 credits', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockResolvedValue({
        subscription_tier: 'basic',
        credits_remaining: 200,
      });

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'basic' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.subscription_tier).toBe('basic');

      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({
          subscription_tier: 'basic',
          subscription_status: 'active',
          $inc: { credits_remaining: 100 },
        }),
        { new: true }
      );
    });

    it('should update subscription to free tier with 0 credits and canceled status', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockResolvedValue({
        subscription_tier: 'free',
        credits_remaining: 100,
      });

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'free' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.subscription_tier).toBe('free');

      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        expect.objectContaining({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          $inc: { credits_remaining: 0 },
        }),
        { new: true }
      );
    });

    it('should return 404 when user not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('User not found');
    });

    it('should return 500 for database error', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockRejectedValue(new Error('DB connection failed'));

      const request = new Request('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await subscriptionPatch(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to update subscription');
    });
  });

  describe('DELETE /api/billing/subscription', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await subscriptionDelete();

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should cancel subscription successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockResolvedValue({
        subscription_tier: 'free',
        subscription_status: 'canceled',
        cancel_at_period_end: true,
      });

      const response = await subscriptionDelete();

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toBe('Subscription cancelled successfully');

      expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        {
          subscription_tier: 'free',
          subscription_status: 'canceled',
          cancel_at_period_end: true,
        },
        { new: true }
      );
    });

    it('should return 404 when user not found', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockResolvedValue(null);

      const response = await subscriptionDelete();

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('User not found');
    });

    it('should return 500 for database error', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockUserFindOneAndUpdate.mockRejectedValue(new Error('DB connection failed'));

      const response = await subscriptionDelete();

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to cancel subscription');
    });
  });
});
