/**
 * Default user data for seeding
 */

export interface UserSeedData {
  email: string;
  name: string;
  password: string; // Plain text, will be hashed during seeding
  role: 'user' | 'admin';
  subscription_tier: 'free' | 'basic' | 'pro';
  credits_remaining: number;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  is_banned?: boolean;
}

/**
 * Get seed users with environment-aware passwords
 */
export function getSeedUsers(): UserSeedData[] {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const systemPassword = process.env.SYSTEM_USER_PASSWORD || 'system123';

  return [
    // System user - owns global system agents
    {
      email: 'system@agoryx.ai',
      name: 'System',
      password: systemPassword,
      role: 'admin',
      subscription_tier: 'pro',
      credits_remaining: 999999,
      subscription_status: 'active',
    },
    // Primary admin user
    {
      email: 'admin@agoryx.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
      subscription_tier: 'pro',
      credits_remaining: 10000,
      subscription_status: 'active',
    },
    // Demo user - Basic tier
    {
      email: 'alice@example.com',
      name: 'Alice Chen',
      password: 'demo123',
      role: 'user',
      subscription_tier: 'basic',
      credits_remaining: 450,
      subscription_status: 'active',
    },
    // Demo user - Free tier
    {
      email: 'bob@example.com',
      name: 'Bob Miller',
      password: 'demo123',
      role: 'user',
      subscription_tier: 'free',
      credits_remaining: 100,
      subscription_status: 'active',
    },
  ];
}

// Email for the system user that owns global agents
export const SYSTEM_USER_EMAIL = 'system@agoryx.ai';
