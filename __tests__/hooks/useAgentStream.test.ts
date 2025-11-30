import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAgentStream, StreamEvent } from '@/lib/hooks/useAgentStream';
import React from 'react';

// Helper to create SSE response
function createSSEStream(events: StreamEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const eventStrings = events.map(
    (event) => `data: ${JSON.stringify(event)}\n\n`
  );

  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < eventStrings.length) {
        controller.enqueue(encoder.encode(eventStrings[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

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

describe('useAgentStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should start with isStreaming false', () => {
      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('should have empty streamingMessages map', () => {
      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.streamingMessages.size).toBe(0);
    });

    it('should have null userMessageId', () => {
      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.userMessageId).toBeNull();
    });

    it('should have zero currentTurn and totalCost', () => {
      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentTurn).toBe(0);
      expect(result.current.totalCost).toBe(0);
    });

    it('should have null error', () => {
      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('startStream', () => {
    it('should set isStreaming to true when starting', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([{ type: 'done' }]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.startStream('conv-123', 'Hello');
      });

      expect(result.current.isStreaming).toBe(true);

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should reset state before starting', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([{ type: 'done' }]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      // Manually set some state (simulating previous run)
      // This is tested indirectly through the stream processing

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.streamingMessages.size).toBe(0);
      expect(result.current.userMessageId).toBeNull();
      expect(result.current.currentTurn).toBe(0);
      expect(result.current.totalCost).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should call fetch with correct parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([{ type: 'done' }]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Hello world', [
          { id: 'att-1', type: 'image', mimeType: 'image/png', name: 'test.png' },
        ]);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello world',
            attachments: [
              { id: 'att-1', type: 'image', mimeType: 'image/png', name: 'test.png' },
            ],
          }),
          signal: expect.any(AbortSignal),
        }
      );
    });
  });

  describe('SSE event processing', () => {
    it('should parse user_message events and set userMessageId', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'user_message', messageId: 'msg-user-1' },
          { type: 'done' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Hello');
      });

      expect(result.current.userMessageId).toBe('msg-user-1');
    });

    it('should create streaming message on agent_start', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'agent_start', messageId: 'msg-agent-1', agentId: 'flash' },
          { type: 'done' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Hello');
      });

      const msg = result.current.streamingMessages.get('msg-agent-1');
      expect(msg).toBeDefined();
      expect(msg?.messageId).toBe('msg-agent-1');
      expect(msg?.agentId).toBe('flash');
      expect(msg?.content).toBe('');
      expect(msg?.isStreaming).toBe(true);
    });

    it('should append content on text events', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'agent_start', messageId: 'msg-1', agentId: 'flash' },
          { type: 'text', messageId: 'msg-1', content: 'Hello' },
          { type: 'text', messageId: 'msg-1', content: ' world' },
          { type: 'text', messageId: 'msg-1', content: '!' },
          { type: 'done' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      const msg = result.current.streamingMessages.get('msg-1');
      expect(msg?.content).toBe('Hello world!');
    });

    it('should set isStreaming false on agent_done', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'agent_start', messageId: 'msg-1', agentId: 'flash' },
          { type: 'text', messageId: 'msg-1', content: 'Response' },
          { type: 'agent_done', messageId: 'msg-1', cost: 0.01, totalTokens: 50 },
          { type: 'done' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      const msg = result.current.streamingMessages.get('msg-1');
      expect(msg?.isStreaming).toBe(false);
    });

    it('should accumulate totalCost from agent_done events', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'agent_start', messageId: 'msg-1', agentId: 'flash' },
          { type: 'agent_done', messageId: 'msg-1', cost: 0.01 },
          { type: 'agent_start', messageId: 'msg-2', agentId: 'sage' },
          { type: 'agent_done', messageId: 'msg-2', cost: 0.02 },
          { type: 'done' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.totalCost).toBeCloseTo(0.03, 5);
    });

    it('should update currentTurn on turn_complete', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'turn_complete', turn: 1 },
          { type: 'turn_complete', turn: 2 },
          { type: 'done' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.currentTurn).toBe(2);
    });

    it('should set error on error events', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream([
          { type: 'error', error: 'Something went wrong' },
        ]),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.error).toBe('Something went wrong');
    });
  });

  describe('error handling', () => {
    it('should set error on HTTP error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.error).toBe('Internal Server Error');
      expect(result.current.isStreaming).toBe(false);
    });

    it('should handle HTTP error with no JSON body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.error).toBe('HTTP 502');
    });

    it('should handle missing response body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.error).toBe('No response body');
    });
  });

  describe('abortStream', () => {
    it('should abort the fetch request', async () => {
      let resolveStream: () => void;
      const streamPromise = new Promise<void>((resolve) => {
        resolveStream = resolve;
      });

      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        async start(controller) {
          // Wait to be aborted
          await streamPromise;
          controller.close();
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      // Start the stream
      act(() => {
        result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.isStreaming).toBe(true);

      // Abort the stream
      act(() => {
        result.current.abortStream();
        resolveStream!(); // Allow stream to close
      });

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(false);
      });
    });

    it('should set isStreaming to false', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              body: createSSEStream([{ type: 'done' }]),
            });
          }, 100);
        });
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.startStream('conv-123', 'Test');
      });

      act(() => {
        result.current.abortStream();
      });

      expect(result.current.isStreaming).toBe(false);
    });

    it('should not set error on abort', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const mockFetch = vi.fn().mockRejectedValue(abortError);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Test');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('full stream flow', () => {
    it('should handle complete collaborative stream', async () => {
      const events: StreamEvent[] = [
        { type: 'user_message', messageId: 'msg-user-1' },
        { type: 'agent_start', messageId: 'msg-agent-1', agentId: 'flash' },
        { type: 'text', messageId: 'msg-agent-1', content: 'Hello from Flash! ' },
        { type: 'text', messageId: 'msg-agent-1', content: 'How can I help?' },
        { type: 'agent_done', messageId: 'msg-agent-1', cost: 0.005, totalTokens: 25 },
        { type: 'agent_start', messageId: 'msg-agent-2', agentId: 'sage' },
        { type: 'text', messageId: 'msg-agent-2', content: 'I agree with Flash.' },
        { type: 'agent_done', messageId: 'msg-agent-2', cost: 0.003, totalTokens: 15 },
        { type: 'turn_complete', turn: 1 },
        { type: 'done' },
      ];

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: createSSEStream(events),
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAgentStream(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startStream('conv-123', 'Hi');
      });

      // Verify final state
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.userMessageId).toBe('msg-user-1');
      expect(result.current.streamingMessages.size).toBe(2);

      const flashMsg = result.current.streamingMessages.get('msg-agent-1');
      expect(flashMsg?.content).toBe('Hello from Flash! How can I help?');
      expect(flashMsg?.isStreaming).toBe(false);

      const sageMsg = result.current.streamingMessages.get('msg-agent-2');
      expect(sageMsg?.content).toBe('I agree with Flash.');
      expect(sageMsg?.isStreaming).toBe(false);

      expect(result.current.totalCost).toBeCloseTo(0.008, 5);
      expect(result.current.currentTurn).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });
});
