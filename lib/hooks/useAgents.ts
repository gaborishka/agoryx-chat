'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Agent } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface AgentListResponse {
  system: Agent[];
  custom: Agent[];
}

interface CreateAgentInput {
  name: string;
  model: string;
  systemInstruction: string;
  avatar_url?: string;
  description?: string;
  ui_color?: string;
}

interface UpdateAgentInput extends Partial<CreateAgentInput> {
  id: string;
}

// ============================================================================
// Fetch Functions
// ============================================================================

async function fetchAgents(): Promise<AgentListResponse> {
  const res = await fetch('/api/agents');
  if (!res.ok) {
    throw new Error('Failed to fetch agents');
  }
  return res.json();
}

async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create agent');
  }
  return res.json();
}

async function updateAgent({ id, ...input }: UpdateAgentInput): Promise<Agent> {
  const res = await fetch(`/api/agents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update agent');
  }
  return res.json();
}

async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`/api/agents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete agent');
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all agents (system + custom)
 */
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get agents as a Record<string, Agent> for easy lookup
 */
export function useAgentsMap() {
  const { data, ...rest } = useAgents();

  const agentsMap = data
    ? [...data.system, ...data.custom].reduce(
        (acc, agent) => {
          acc[agent.id] = agent;
          return acc;
        },
        {} as Record<string, Agent>
      )
    : {};

  return { data: agentsMap, ...rest };
}

/**
 * Create a new custom agent
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

/**
 * Update an existing custom agent
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}

/**
 * Delete a custom agent
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
