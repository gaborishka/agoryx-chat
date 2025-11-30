import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';

export interface TestUser {
  _id?: Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  role: 'user' | 'admin';
  is_banned: boolean;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string;
  current_period_end?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    _id: new Types.ObjectId(),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    credits_remaining: 100,
    subscription_tier: 'free',
    subscription_status: 'active',
    role: 'user',
    is_banned: false,
    cancel_at_period_end: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestAdmin(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    role: 'admin',
    subscription_tier: 'pro',
    credits_remaining: 10000,
    ...overrides,
  });
}

export function createBannedUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    is_banned: true,
    ...overrides,
  });
}

export function createProUser(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    subscription_tier: 'pro',
    credits_remaining: 1000,
    ...overrides,
  });
}
