import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useBillingHistory,
  useCreateCheckout,
  useCreatePortal,
  useUpdateSubscription,
  useCancelSubscription,
} from '@/lib/hooks/useBilling';
import React from 'react';

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

describe('useBilling hooks', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    window.location = originalLocation;
  });

  describe('useBillingHistory', () => {
    it('should fetch billing history successfully', async () => {
      const mockHistory = {
        history: [
          { id: '1', date: '2024-01-01', amount: 10.00, status: 'paid', description: 'Pro subscription' },
          { id: '2', date: '2024-02-01', amount: 10.00, status: 'paid', description: 'Pro subscription' },
        ],
        total: 2,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useBillingHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockHistory);
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/history');
    });

    it('should handle fetch error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useBillingHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should return empty history for new users', async () => {
      const mockHistory = {
        history: [],
        total: 0,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useBillingHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.history).toHaveLength(0);
    });
  });

  describe('useCreateCheckout', () => {
    it('should create checkout session and redirect', async () => {
      const mockResponse = {
        url: 'https://checkout.stripe.com/session-123',
        sessionId: 'session-123',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateCheckout(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('pro');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(window.location.href).toBe('https://checkout.stripe.com/session-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      });
    });

    it('should handle checkout error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid tier' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateCheckout(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('invalid-tier');
        })
      ).rejects.toThrow('Invalid tier');
    });

    it('should handle checkout error without JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateCheckout(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('pro');
        })
      ).rejects.toThrow('Failed to create checkout session');
    });
  });

  describe('useCreatePortal', () => {
    it('should create portal session and redirect', async () => {
      const mockResponse = {
        url: 'https://billing.stripe.com/portal-123',
        sessionId: 'portal-123',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreatePortal(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(window.location.href).toBe('https://billing.stripe.com/portal-123');
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/portal', {
        method: 'POST',
      });
    });

    it('should handle portal error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Not subscribed' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreatePortal(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync();
        })
      ).rejects.toThrow('Not subscribed');
    });
  });

  describe('useUpdateSubscription', () => {
    it('should update subscription successfully', async () => {
      const mockResponse = {
        success: true,
        subscription_tier: 'pro',
        credits_remaining: 1000,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateSubscription(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('pro');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('/api/billing/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      });
    });

    it('should handle downgrade subscription', async () => {
      const mockResponse = {
        success: true,
        subscription_tier: 'basic',
        credits_remaining: 100,
        message: 'Downgrade will take effect at the end of billing period',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateSubscription(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('basic');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.message).toContain('Downgrade');
    });

    it('should handle update error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Payment required' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateSubscription(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('pro');
        })
      ).rejects.toThrow('Payment required');
    });
  });

  describe('useCancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Subscription canceled',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCancelSubscription(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith('/api/billing/subscription', {
        method: 'DELETE',
      });
    });

    it('should handle cancellation error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Cannot cancel free tier' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCancelSubscription(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync();
        })
      ).rejects.toThrow('Cannot cancel free tier');
    });
  });
});
