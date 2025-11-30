import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCredits, useHasCredits } from '@/lib/hooks/useCredits';
import React from 'react';

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('useCredits hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useCredits', () => {
    it('should fetch credits successfully', async () => {
      const mockCredits = {
        credits_remaining: 100,
        subscription_tier: 'pro',
        subscription_status: 'active',
        current_period_end: '2024-02-01',
        cancel_at_period_end: false,
        recentUsage: {
          total_tokens: 5000,
          total_cost: 0.05,
          count: 10,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCredits);
      expect(mockFetch).toHaveBeenCalledWith('/api/user/credits');
    });

    it('should handle fetch error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it('should fetch credits for free tier', async () => {
      const mockCredits = {
        credits_remaining: 5,
        subscription_tier: 'free',
        subscription_status: 'active',
        cancel_at_period_end: false,
        recentUsage: {
          total_tokens: 0,
          total_cost: 0,
          count: 0,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.subscription_tier).toBe('free');
      expect(result.current.data?.credits_remaining).toBe(5);
    });

    it('should handle canceled subscription', async () => {
      const mockCredits = {
        credits_remaining: 50,
        subscription_tier: 'basic',
        subscription_status: 'canceled',
        current_period_end: '2024-01-15',
        cancel_at_period_end: true,
        recentUsage: {
          total_tokens: 1000,
          total_cost: 0.01,
          count: 5,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.subscription_status).toBe('canceled');
      expect(result.current.data?.cancel_at_period_end).toBe(true);
    });
  });

  describe('useHasCredits', () => {
    it('should return hasCredits true when user has enough credits', async () => {
      const mockCredits = {
        credits_remaining: 100,
        subscription_tier: 'pro',
        subscription_status: 'active',
        cancel_at_period_end: false,
        recentUsage: { total_tokens: 0, total_cost: 0, count: 0 },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useHasCredits(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasCredits).toBe(true);
      expect(result.current.credits).toBe(100);
    });

    it('should return hasCredits false when user does not have enough credits', async () => {
      const mockCredits = {
        credits_remaining: 5,
        subscription_tier: 'free',
        subscription_status: 'active',
        cancel_at_period_end: false,
        recentUsage: { total_tokens: 0, total_cost: 0, count: 0 },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useHasCredits(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasCredits).toBe(false);
      expect(result.current.credits).toBe(5);
    });

    it('should use default of 1 credit required', async () => {
      const mockCredits = {
        credits_remaining: 1,
        subscription_tier: 'free',
        subscription_status: 'active',
        cancel_at_period_end: false,
        recentUsage: { total_tokens: 0, total_cost: 0, count: 0 },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useHasCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasCredits).toBe(true);
      expect(result.current.credits).toBe(1);
    });

    it('should return hasCredits false when credits are zero', async () => {
      const mockCredits = {
        credits_remaining: 0,
        subscription_tier: 'free',
        subscription_status: 'active',
        cancel_at_period_end: false,
        recentUsage: { total_tokens: 0, total_cost: 0, count: 0 },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCredits),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useHasCredits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasCredits).toBe(false);
      expect(result.current.credits).toBe(0);
    });

    it('should return false hasCredits while loading', () => {
      const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      global.fetch = mockFetch;

      const { result } = renderHook(() => useHasCredits(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasCredits).toBe(false);
      expect(result.current.credits).toBe(0);
    });
  });
});
