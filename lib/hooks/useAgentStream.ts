'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Attachment } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface StreamEvent {
  type:
    | 'user_message'
    | 'agent_start'
    | 'text'
    | 'agent_done'
    | 'turn_complete'
    | 'done'
    | 'error';
  messageId?: string;
  agentId?: string;
  content?: string;
  cost?: number;
  totalTokens?: number;
  turn?: number;
  error?: string;
}

export interface StreamingMessage {
  messageId: string;
  agentId: string;
  content: string;
  isStreaming: boolean;
}

export interface UseAgentStreamReturn {
  isStreaming: boolean;
  streamingMessages: Map<string, StreamingMessage>;
  userMessageId: string | null;
  currentTurn: number;
  totalCost: number;
  error: string | null;
  startStream: (
    conversationId: string,
    content: string,
    attachments?: Attachment[]
  ) => Promise<void>;
  abortStream: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAgentStream(): UseAgentStreamReturn {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessages, setStreamingMessages] = useState<
    Map<string, StreamingMessage>
  >(new Map());
  const [userMessageId, setUserMessageId] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (
      conversationId: string,
      content: string,
      attachments?: Attachment[]
    ) => {
      // Reset state
      setIsStreaming(true);
      setStreamingMessages(new Map());
      setUserMessageId(null);
      setCurrentTurn(0);
      setTotalCost(0);
      setError(null);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, attachments }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: StreamEvent = JSON.parse(line.slice(6));
                processEvent(event);
              } catch {
                console.warn('Failed to parse SSE event:', line);
              }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith('data: ')) {
          try {
            const event: StreamEvent = JSON.parse(buffer.slice(6));
            processEvent(event);
          } catch {
            // Ignore incomplete final event
          }
        }

        // Invalidate conversation query to refresh messages
        queryClient.invalidateQueries({
          queryKey: ['conversation', conversationId],
        });
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // Stream was intentionally aborted
          return;
        }
        setError((err as Error).message);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }

      function processEvent(event: StreamEvent) {
        switch (event.type) {
          case 'user_message':
            setUserMessageId(event.messageId || null);
            break;

          case 'agent_start':
            if (event.messageId && event.agentId) {
              setStreamingMessages((prev) => {
                const next = new Map(prev);
                next.set(event.messageId!, {
                  messageId: event.messageId!,
                  agentId: event.agentId!,
                  content: '',
                  isStreaming: true,
                });
                return next;
              });
            }
            break;

          case 'text':
            if (event.messageId && event.content) {
              setStreamingMessages((prev) => {
                const next = new Map(prev);
                const existing = next.get(event.messageId!);
                if (existing) {
                  next.set(event.messageId!, {
                    ...existing,
                    content: existing.content + event.content!,
                  });
                }
                return next;
              });
            }
            break;

          case 'agent_done':
            if (event.messageId) {
              setStreamingMessages((prev) => {
                const next = new Map(prev);
                const existing = next.get(event.messageId!);
                if (existing) {
                  next.set(event.messageId!, {
                    ...existing,
                    isStreaming: false,
                  });
                }
                return next;
              });
              if (event.cost) {
                setTotalCost((prev) => prev + event.cost!);
              }
            }
            break;

          case 'turn_complete':
            setCurrentTurn(event.turn || 0);
            break;

          case 'done':
            // Final event - all streaming complete
            break;

          case 'error':
            setError(event.error || 'Unknown error');
            break;
        }
      }
    },
    [queryClient]
  );

  return {
    isStreaming,
    streamingMessages,
    userMessageId,
    currentTurn,
    totalCost,
    error,
    startStream,
    abortStream,
  };
}
