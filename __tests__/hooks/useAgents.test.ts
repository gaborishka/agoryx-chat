import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAgents,
  useAgentsMap,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
} from '@/lib/hooks/useAgents';
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

describe('useAgents hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useAgents', () => {
    it('should fetch agents successfully', async () => {
      const mockAgents = {
        system: [
          { id: 'flash', name: 'Flash', model: 'gemini-2.0-flash' },
          { id: 'sage', name: 'Sage', model: 'gemini-2.0-flash' },
        ],
        custom: [
          { id: 'custom-1', name: 'My Agent', model: 'gemini-2.0-flash' },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockAgents);
      expect(result.current.data?.system).toHaveLength(2);
      expect(result.current.data?.custom).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/agents');
    });

    it('should handle fetch error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should return empty custom agents for new users', async () => {
      const mockAgents = {
        system: [{ id: 'flash', name: 'Flash', model: 'gemini-2.0-flash' }],
        custom: [],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.custom).toHaveLength(0);
    });
  });

  describe('useAgentsMap', () => {
    it('should return agents as a map', async () => {
      const mockAgents = {
        system: [
          { id: 'flash', name: 'Flash', model: 'gemini-2.0-flash' },
          { id: 'sage', name: 'Sage', model: 'gemini-2.0-flash' },
        ],
        custom: [
          { id: 'custom-1', name: 'My Agent', model: 'gemini-2.0-flash' },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentsMap(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual({
        flash: { id: 'flash', name: 'Flash', model: 'gemini-2.0-flash' },
        sage: { id: 'sage', name: 'Sage', model: 'gemini-2.0-flash' },
        'custom-1': { id: 'custom-1', name: 'My Agent', model: 'gemini-2.0-flash' },
      });
    });

    it('should return empty object when data is not available', () => {
      const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentsMap(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual({});
    });

    it('should allow lookup by agent id', async () => {
      const mockAgents = {
        system: [{ id: 'flash', name: 'Flash', model: 'gemini-2.0-flash', ui_color: 'blue' }],
        custom: [],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentsMap(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data['flash']).toEqual({
        id: 'flash',
        name: 'Flash',
        model: 'gemini-2.0-flash',
        ui_color: 'blue',
      });
      expect(result.current.data['non-existent']).toBeUndefined();
    });
  });

  describe('useCreateAgent', () => {
    it('should create agent successfully', async () => {
      const mockAgent = {
        id: 'new-agent-1',
        name: 'New Agent',
        model: 'gemini-2.0-flash',
        systemInstruction: 'You are a helpful assistant.',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateAgent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: 'New Agent',
          model: 'gemini-2.0-flash',
          systemInstruction: 'You are a helpful assistant.',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockAgent);
      expect(mockFetch).toHaveBeenCalledWith('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Agent',
          model: 'gemini-2.0-flash',
          systemInstruction: 'You are a helpful assistant.',
        }),
      });
    });

    it('should create agent with optional fields', async () => {
      const mockAgent = {
        id: 'new-agent-2',
        name: 'Custom Agent',
        model: 'gemini-2.0-flash',
        systemInstruction: 'Test instruction',
        avatar_url: 'https://example.com/avatar.png',
        description: 'A custom agent',
        ui_color: '#FF5733',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateAgent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          name: 'Custom Agent',
          model: 'gemini-2.0-flash',
          systemInstruction: 'Test instruction',
          avatar_url: 'https://example.com/avatar.png',
          description: 'A custom agent',
          ui_color: '#FF5733',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle creation error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Name already exists' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useCreateAgent(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            name: 'Duplicate Agent',
            model: 'gemini-2.0-flash',
            systemInstruction: 'Test',
          });
        })
      ).rejects.toThrow('Name already exists');
    });
  });

  describe('useUpdateAgent', () => {
    it('should update agent successfully', async () => {
      const mockAgent = {
        id: 'custom-1',
        name: 'Updated Agent',
        model: 'gemini-2.0-flash',
        systemInstruction: 'Updated instruction',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateAgent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'custom-1',
          name: 'Updated Agent',
          systemInstruction: 'Updated instruction',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/custom-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Agent',
          systemInstruction: 'Updated instruction',
        }),
      });
    });

    it('should update only specific fields', async () => {
      const mockAgent = {
        id: 'custom-1',
        name: 'Original Name',
        model: 'gemini-2.0-flash',
        ui_color: '#FF0000',
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateAgent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate({
          id: 'custom-1',
          ui_color: '#FF0000',
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/custom-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ui_color: '#FF0000' }),
      });
    });

    it('should handle update error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Agent not found' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useUpdateAgent(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'non-existent',
            name: 'Test',
          });
        })
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('useDeleteAgent', () => {
    it('should delete agent successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useDeleteAgent(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('custom-1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith('/api/agents/custom-1', {
        method: 'DELETE',
      });
    });

    it('should handle deletion error for system agent', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Cannot delete system agent' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useDeleteAgent(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('flash');
        })
      ).rejects.toThrow('Cannot delete system agent');
    });

    it('should handle deletion error for non-existent agent', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Agent not found' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useDeleteAgent(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('non-existent');
        })
      ).rejects.toThrow('Agent not found');
    });
  });
});
