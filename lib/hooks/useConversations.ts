'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Conversation, ChatMode, ConversationAgentConfig } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface ConversationListItem {
  id: string;
  title: string;
  preview: string;
  mode: ChatMode;
  updatedAt: string;
}

interface ConversationDetail extends Omit<Conversation, 'messages'> {
  messages: Array<{
    id: string;
    conversation_id: string;
    sender_type: 'user' | 'agent';
    sender_id: string;
    content: string;
    created_at: string;
    createdAt?: string;
    metadata?: object;
  }>;
}

interface CreateConversationInput {
  title?: string;
  mode?: ChatMode;
  agentConfig?: Partial<ConversationAgentConfig>;
}

interface UpdateConversationInput {
  title?: string;
  mode?: ChatMode;
  agentConfig?: Partial<ConversationAgentConfig>;
  enableAutoReply?: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    totalPages: number;
  };
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchConversations(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<ConversationListItem>> {
  const res = await fetch(`/api/conversations?page=${page}&limit=${limit}`);
  if (!res.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return res.json();
}

async function fetchConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) {
    throw new Error('Failed to fetch conversation');
  }
  return res.json();
}

async function createConversation(
  input: CreateConversationInput
): Promise<{ id: string }> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Failed to create conversation');
  }
  return res.json();
}

async function updateConversation(
  id: string,
  input: UpdateConversationInput
): Promise<ConversationDetail> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error('Failed to update conversation');
  }
  return res.json();
}

async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete conversation');
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch paginated list of conversations
 */
export function useConversations(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['conversations', page, limit],
    queryFn: () => fetchConversations(page, limit),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch a single conversation with its messages
 */
export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(id!),
    enabled: !!id,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Create a new conversation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Update an existing conversation
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateConversationInput & { id: string }) =>
      updateConversation(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: ['conversation', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
