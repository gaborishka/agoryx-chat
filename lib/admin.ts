/**
 * Admin Service (Client-side mock)
 *
 * This is a mock service for the admin panel UI.
 * For production, AdminPanel should use API routes that call lib/services/admin.service.ts
 *
 * TODO: Refactor AdminPanel to use /api/admin/* routes instead of this mock
 */

import { PRICING_TIERS } from '../constants';

export interface User {
  id: string;
  full_name: string;
  email: string;
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  role: 'user' | 'admin';
  joined_at: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  stripe_customer_id?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  is_banned?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeSubs: number;
  totalRevenue: number;
  apiHealth: 'healthy' | 'degraded' | 'down';
  errorRate: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

// Mock users for client-side demo
const MOCK_USERS: User[] = [
  {
    id: 'u1',
    full_name: 'Admin User',
    email: 'admin@agoryx.ai',
    credits_remaining: 9999,
    subscription_tier: 'pro',
    role: 'admin',
    joined_at: '2024-01-01',
    subscription_status: 'active',
    stripe_customer_id: 'cus_ADMIN123',
    cancel_at_period_end: false,
    current_period_end: 'April 1, 2025',
  },
  {
    id: 'u2',
    full_name: 'Alice Chen',
    email: 'alice@example.com',
    credits_remaining: 450,
    subscription_tier: 'basic',
    role: 'user',
    joined_at: '2024-02-15',
    subscription_status: 'active',
    current_period_end: 'March 15, 2024',
  },
  {
    id: 'u3',
    full_name: 'Bob Miller',
    email: 'bob@example.com',
    credits_remaining: 10,
    subscription_tier: 'free',
    role: 'user',
    joined_at: '2024-03-01',
    subscription_status: 'active',
  },
  {
    id: 'u4',
    full_name: 'Charlie Davis',
    email: 'charlie@example.com',
    credits_remaining: 0,
    subscription_tier: 'pro',
    role: 'user',
    joined_at: '2023-12-20',
    subscription_status: 'past_due',
    is_banned: false,
  },
];

// In-memory state for the session
let dbUsers = [...MOCK_USERS];

export const AdminService = {
  async getStats(): Promise<AdminStats> {
    await new Promise((r) => setTimeout(r, 600));

    const totalUsers = dbUsers.length;
    const activeSubs = dbUsers.filter(
      (u) => u.subscription_status === 'active' && u.subscription_tier !== 'free'
    ).length;

    const totalRevenue = dbUsers.reduce((acc, user) => {
      return acc + (PRICING_TIERS[user.subscription_tier].monthlyPriceVal || 0);
    }, 0);

    return {
      totalUsers,
      activeSubs,
      totalRevenue,
      apiHealth: 'healthy',
      errorRate: 0.02,
    };
  },

  async getAllUsers(): Promise<User[]> {
    await new Promise((r) => setTimeout(r, 800));
    return [...dbUsers];
  },

  async updateUserCredits(userId: string, amount: number): Promise<User> {
    await new Promise((r) => setTimeout(r, 500));
    const userIndex = dbUsers.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    const updatedUser = { ...dbUsers[userIndex], credits_remaining: amount };
    dbUsers[userIndex] = updatedUser;
    return updatedUser;
  },

  async toggleUserBan(userId: string): Promise<User> {
    await new Promise((r) => setTimeout(r, 500));
    const userIndex = dbUsers.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found');

    const currentBanStatus = !!dbUsers[userIndex].is_banned;
    const updatedUser = { ...dbUsers[userIndex], is_banned: !currentBanStatus };
    dbUsers[userIndex] = updatedUser;
    return updatedUser;
  },

  async getSystemLogs(): Promise<SystemLog[]> {
    await new Promise((r) => setTimeout(r, 400));
    return [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Backup completed successfully',
        source: 'System',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        level: 'warning',
        message: 'High latency detected in US-East',
        source: 'API Gateway',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        level: 'error',
        message: 'Payment webhook signature verification failed',
        source: 'Stripe Webhook',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        level: 'info',
        message: 'New user registration',
        source: 'Auth Service',
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        level: 'info',
        message: 'Daily analytics aggregation job finished',
        source: 'Analytics Worker',
      },
    ];
  },
};
