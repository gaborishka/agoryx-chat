/**
 * Application Constants
 *
 * This file contains static configuration that rarely changes.
 * Agent data and user data are stored in the database - see scripts/seed/data/
 */

import { PricingTier, SubscriptionTier, ConversationAgentConfig } from './types';

/**
 * Pricing tiers for subscriptions
 * Used for billing UI and revenue calculations
 */
export const PRICING_TIERS: Record<SubscriptionTier, PricingTier> = {
  free: {
    id: 'free',
    name: 'Freemium',
    price: '$0',
    monthlyPriceVal: 0,
    annualPriceVal: 0,
    stripePriceId: 'price_free',
    credits: 100,
    features: ['Access to Flash', 'Limited Sage access', 'Standard support'],
    color: 'slate',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: '$9.99',
    monthlyPriceVal: 9.99,
    annualPriceVal: 99.99,
    stripePriceId: 'price_basic_monthly',
    credits: 1000,
    features: [
      'Access to Flash & Sage',
      'Priority processing',
      'Email support',
      '2x Context Window',
    ],
    color: 'blue',
    badge: 'Most Popular',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$29.99',
    monthlyPriceVal: 29.99,
    annualPriceVal: 299.99,
    stripePriceId: 'price_pro_monthly',
    credits: 5000,
    features: [
      'Unlimited Flash',
      'High Sage limits',
      'Early access features',
      '24/7 Support',
      'Max Context',
    ],
    color: 'amber',
  },
};

/**
 * Default agent configuration for new conversations
 * References agent IDs that are seeded in the database
 */
export const DEFAULT_CONFIG: ConversationAgentConfig = {
  system1Id: 'flash',
  system2Id: 'sage',
  proponentId: 'debater_pro',
  opponentId: 'debater_con',
  moderatorId: 'moderator',
  councilIds: ['lawyer', 'economist'],
};
