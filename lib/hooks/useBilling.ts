'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

interface BillingHistoryResponse {
  history: BillingHistoryItem[];
  total: number;
}

interface CheckoutResponse {
  url: string;
  sessionId: string;
}

interface SubscriptionResponse {
  success: boolean;
  subscription_tier?: string;
  credits_remaining?: number;
  message?: string;
}

async function fetchBillingHistory(): Promise<BillingHistoryResponse> {
  const res = await fetch('/api/billing/history');
  if (!res.ok) {
    throw new Error('Failed to fetch billing history');
  }
  return res.json();
}

async function createCheckoutSession(tier: string): Promise<CheckoutResponse> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create checkout session');
  }
  return res.json();
}

async function createPortalSession(): Promise<CheckoutResponse> {
  const res = await fetch('/api/billing/portal', {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create portal session');
  }
  return res.json();
}

async function updateSubscription(tier: string): Promise<SubscriptionResponse> {
  const res = await fetch('/api/billing/subscription', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update subscription');
  }
  return res.json();
}

async function cancelSubscription(): Promise<SubscriptionResponse> {
  const res = await fetch('/api/billing/subscription', {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to cancel subscription');
  }
  return res.json();
}

export function useBillingHistory() {
  return useQuery({
    queryKey: ['billing', 'history'],
    queryFn: fetchBillingHistory,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      // Redirect to checkout URL
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: (data) => {
      // Redirect to portal URL
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}
