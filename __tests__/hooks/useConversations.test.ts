import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
} from '@/lib/hooks/useConversations';
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

describe('useConversations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useConversations', () => {
    it('should fetch conversations successfully', async () => {
      const mockData = {
        data: [
          { id: '1', title: 'Chat 1', preview: 'Hello', mode: 'collaborative', updatedAt: '2024-01-01' },
          { id: '2', title: 'Chat 2', preview: 'World', mode: 'debate', updatedAt: '2024-01-02' },
        ],
        pagination: { total: 2, page: 1, totalPages: 1 },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('/api/conversations?page=1&limit=20');
    });

    it('should fetch with custom pagination', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], pagination: { total: 0, page: 2, totalPages: 0 } }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useConversations(2, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockFetch).toHaveBeenCalledWith('/api/conversations?page=2&limit=10');
    });

    it('should handle fetch error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe('useConversation', () => {
    it('should not fetch when id is null', () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      const { result } = renderHook(() => useConversation(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch single conversation by id', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test Chat',
        mode: 'collaborative',
        messages: [
          { id: 'msg-1', content: 'Hello', sender_type: 'user', sender_id: 'user-1' },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConversation),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useConversation('conv-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockConversation);
      expect(mockFetch).toHaveBeenCalledWith('/api/conversations/conv-123');
    });

    it('should handle fetch error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useConversation('not-found'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateConversation', () => {
    it('should create conversation successfully', async () => {
      const mockResponse = { id: 'new-conv-123' };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({ title: 'New Chat', mode: 'collaborative' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', mode: 'collaborative' }),
      });
    });

    it('should handle creation error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ title: '' });
        })
      ).rejects.toThrow('Failed to create conversation');
    });
  });

  describe('useUpdateConversation', () => {
    it('should update conversation successfully', async () => {
      const mockResponse = { id: 'conv-123', title: 'Updated Title', mode: 'debate' };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'conv-123',
          title: 'Updated Title',
          mode: 'debate',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith('/api/conversations/conv-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', mode: 'debate' }),
      });
    });

    it('should handle update error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateConversation(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ id: 'not-found', title: 'Test' });
        })
      ).rejects.toThrow('Failed to update conversation');
    });
  });

  describe('useDeleteConversation', () => {
    it('should delete conversation successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useDeleteConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('conv-123');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith('/api/conversations/conv-123', {
        method: 'DELETE',
      });
    });

    it('should handle deletion error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useDeleteConversation(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('forbidden-conv');
        })
      ).rejects.toThrow('Failed to delete conversation');
    });
  });
});
