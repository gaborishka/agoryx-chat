'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Message } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface MessageListResponse {
  data: Message[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

interface UpdateMessageInput {
  conversationId: string;
  messageId: string;
  isPinned?: boolean;
  feedback?: 'up' | 'down' | null;
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchMessages(
  conversationId: string,
  page = 1,
  limit = 50,
  order: 'asc' | 'desc' = 'asc'
): Promise<MessageListResponse> {
  const res = await fetch(
    `/api/conversations/${conversationId}/messages?page=${page}&limit=${limit}&order=${order}`
  );
  if (!res.ok) {
    throw new Error('Failed to fetch messages');
  }
  return res.json();
}

async function updateMessage({
  conversationId,
  messageId,
  ...input
}: UpdateMessageInput): Promise<Message> {
  const res = await fetch(
    `/api/conversations/${conversationId}/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) {
    throw new Error('Failed to update message');
  }
  return res.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated messages for a conversation
 */
export function useMessages(
  conversationId: string | null,
  page = 1,
  limit = 50,
  order: 'asc' | 'desc' = 'asc'
) {
  return useQuery({
    queryKey: ['messages', conversationId, page, limit, order],
    queryFn: () => fetchMessages(conversationId!, page, limit, order),
    enabled: !!conversationId,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Update a message (pin/unpin, feedback)
 */
export function useUpdateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversation', variables.conversationId],
      });
    },
  });
}
