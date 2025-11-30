'use client';

import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface CreditsInfo {
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_end?: string;
  cancel_at_period_end: boolean;
  recentUsage: {
    total_tokens: number;
    total_cost: number;
    count: number;
  };
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchCredits(): Promise<CreditsInfo> {
  const res = await fetch('/api/user/credits');
  if (!res.ok) {
    throw new Error('Failed to fetch credits');
  }
  return res.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch user credits and usage information
 */
export function useCredits() {
  return useQuery({
    queryKey: ['credits'],
    queryFn: fetchCredits,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Check if user has enough credits for an operation
 */
export function useHasCredits(requiredCredits = 1) {
  const { data, isLoading } = useCredits();

  return {
    hasCredits: data ? data.credits_remaining >= requiredCredits : false,
    credits: data?.credits_remaining ?? 0,
    isLoading,
  };
}
