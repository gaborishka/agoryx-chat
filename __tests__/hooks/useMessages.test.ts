import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMessages, useUpdateMessage } from '@/lib/hooks/useMessages';
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

describe('useMessages hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useMessages', () => {
    it('should not fetch when conversationId is null', () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { result } = renderHook(() => useMessages(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch messages for conversation', async () => {
      const mockData = {
        data: [
          { id: 'msg-1', content: 'Hello', sender_type: 'user', sender_id: 'user-1' },
          { id: 'msg-2', content: 'Hi there!', sender_type: 'agent', sender_id: 'flash' },
        ],
        pagination: { total: 2, page: 1, totalPages: 1 },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useMessages('conv-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages?page=1&limit=50&order=asc'
      );
    });

    it('should fetch with custom pagination and order', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], pagination: { total: 0, page: 2, totalPages: 0 } }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useMessages('conv-123', 2, 25, 'desc'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages?page=2&limit=25&order=desc'
      );
    });

    it('should handle fetch error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useMessages('conv-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdateMessage', () => {
    it('should update message feedback', async () => {
      const mockResponse = {
        id: 'msg-1',
        content: 'Test message',
        feedback: 'up',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          conversationId: 'conv-123',
          messageId: 'msg-1',
          feedback: 'up',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages/msg-1',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback: 'up' }),
        }
      );
    });

    it('should update message pin status', async () => {
      const mockResponse = {
        id: 'msg-1',
        content: 'Test message',
        isPinned: true,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          conversationId: 'conv-123',
          messageId: 'msg-1',
          isPinned: true,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages/msg-1',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPinned: true }),
        }
      );
    });

    it('should clear message feedback with null', async () => {
      const mockResponse = {
        id: 'msg-1',
        content: 'Test message',
        feedback: null,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          conversationId: 'conv-123',
          messageId: 'msg-1',
          feedback: null,
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle update error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateMessage(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            conversationId: 'conv-123',
            messageId: 'not-found',
            feedback: 'up',
          });
        })
      ).rejects.toThrow('Failed to update message');
    });
  });
});
