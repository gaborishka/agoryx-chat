import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Agent, { IAgent, UiColor } from '@/lib/db/models/Agent';
import User from '@/lib/db/models/User';
import { DEFAULT_AGENTS } from '@/constants';
import { CreateAgentInput, UpdateAgentInput } from '@/lib/validations';

export interface AgentItem {
  id: string;
  name: string;
  model: string; // Frontend expects 'model', not 'modelName'
  avatar_url?: string;
  description?: string;
  ui_color: UiColor;
  systemInstruction?: string;
  isCustom: boolean;
  isSystem: boolean;
}

// System user email that owns all system agents
const SYSTEM_USER_EMAIL = 'system@agoryx.ai';

// Cache for system agents loaded from database
let systemAgentsCache: Record<string, AgentItem> | null = null;
let systemUserIdCache: string | null = null;

/**
 * Get system agents from database, with fallback to DEFAULT_AGENTS
 */
async function getSystemAgentsFromDB(): Promise<Record<string, AgentItem>> {
  if (systemAgentsCache) {
    return systemAgentsCache;
  }

  try {
    await connectDB();

    // Find system user
    const systemUser = await User.findOne({ email: SYSTEM_USER_EMAIL }).lean();
    if (!systemUser) {
      // No system user, use hardcoded defaults
      return convertDefaultAgents();
    }

    systemUserIdCache = systemUser._id.toString();

    // Fetch system agents from database
    const agents = await Agent.find({
      user_id: systemUser._id,
      isCustom: false,
    }).lean();

    if (agents.length === 0) {
      // No agents in DB, use hardcoded defaults
      return convertDefaultAgents();
    }

    // Convert to AgentItem format and cache
    systemAgentsCache = agents.reduce(
      (acc, agent) => {
        acc[agent.agent_id] = {
          id: agent.agent_id,
          name: agent.name,
          model: agent.modelName,
          avatar_url: agent.avatar_url,
          description: agent.description,
          ui_color: agent.ui_color,
          systemInstruction: agent.systemInstruction,
          isCustom: false,
          isSystem: true,
        };
        return acc;
      },
      {} as Record<string, AgentItem>
    );

    return systemAgentsCache;
  } catch (error) {
    console.error('[AgentService] Failed to load system agents from DB:', error);
    return convertDefaultAgents();
  }
}

/**
 * Convert DEFAULT_AGENTS to AgentItem format
 */
function convertDefaultAgents(): Record<string, AgentItem> {
  return Object.entries(DEFAULT_AGENTS).reduce(
    (acc, [key, agent]) => {
      acc[key] = {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        avatar_url: agent.avatar_url,
        description: agent.description,
        ui_color: agent.ui_color as UiColor,
        systemInstruction: agent.systemInstruction,
        isCustom: false,
        isSystem: true,
      };
      return acc;
    },
    {} as Record<string, AgentItem>
  );
}

/**
 * Invalidate the system agents cache
 * Call this when system agents are updated
 */
export function invalidateSystemAgentsCache(): void {
  systemAgentsCache = null;
}

/**
 * Get the system user ID
 */
export async function getSystemUserId(): Promise<string | null> {
  if (systemUserIdCache) {
    return systemUserIdCache;
  }

  try {
    await connectDB();
    const systemUser = await User.findOne({ email: SYSTEM_USER_EMAIL }).lean();
    if (systemUser) {
      systemUserIdCache = systemUser._id.toString();
      return systemUserIdCache;
    }
    return null;
  } catch {
    return null;
  }
}

export class AgentService {
  /**
   * List all agents for a user (system agents + custom agents)
   * System agents are loaded from database with fallback to DEFAULT_AGENTS
   */
  static async listAll(userId: string): Promise<AgentItem[]> {
    await connectDB();

    // Get system agents (from DB or fallback)
    const systemAgentsMap = await getSystemAgentsFromDB();
    const systemAgentsList = Object.values(systemAgentsMap);

    // Get user's custom agents
    const customAgents = await Agent.find({ user_id: userId, isCustom: true }).lean();

    // Convert custom agents to AgentItem format
    const customAgentsList: AgentItem[] = customAgents.map((agent) => ({
      id: agent.agent_id,
      name: agent.name,
      model: agent.modelName,
      avatar_url: agent.avatar_url,
      description: agent.description,
      ui_color: agent.ui_color,
      systemInstruction: agent.systemInstruction,
      isCustom: true,
      isSystem: false,
    }));

    // Return merged list (system agents first, then custom)
    return [...systemAgentsList, ...customAgentsList];
  }

  /**
   * Get a single agent by ID for a user
   * Checks system agents (from DB with fallback) first, then custom agents
   */
  static async getById(userId: string, agentId: string): Promise<AgentItem | null> {
    await connectDB();

    // Check if it's a system agent (from DB or fallback)
    const systemAgents = await getSystemAgentsFromDB();
    if (systemAgents[agentId]) {
      return systemAgents[agentId];
    }

    // Check if it's a custom agent
    const customAgent = await Agent.findOne({
      user_id: userId,
      agent_id: agentId,
    }).lean();

    if (!customAgent) return null;

    return {
      id: customAgent.agent_id,
      name: customAgent.name,
      model: customAgent.modelName,
      avatar_url: customAgent.avatar_url,
      description: customAgent.description,
      ui_color: customAgent.ui_color,
      systemInstruction: customAgent.systemInstruction,
      isCustom: true,
      isSystem: false,
    };
  }

  /**
   * Create a custom agent for a user
   */
  static async createCustom(
    userId: string,
    data: CreateAgentInput
  ): Promise<AgentItem> {
    await connectDB();

    // Check if agent_id conflicts with system agents
    const systemAgents = await getSystemAgentsFromDB();
    if (systemAgents[data.agent_id]) {
      throw new Error('Agent ID conflicts with a system agent');
    }

    // Check if agent_id already exists for this user
    const existingAgent = await Agent.findOne({
      user_id: userId,
      agent_id: data.agent_id,
    });

    if (existingAgent) {
      throw new Error('An agent with this ID already exists');
    }

    const agent = await Agent.create({
      user_id: new mongoose.Types.ObjectId(userId),
      agent_id: data.agent_id,
      name: data.name,
      modelName: data.modelName,
      avatar_url: data.avatar_url,
      description: data.description,
      ui_color: data.ui_color,
      systemInstruction: data.systemInstruction,
      isCustom: true,
    });

    return {
      id: agent.agent_id,
      name: agent.name,
      model: agent.modelName,
      avatar_url: agent.avatar_url,
      description: agent.description,
      ui_color: agent.ui_color,
      systemInstruction: agent.systemInstruction,
      isCustom: true,
      isSystem: false,
    };
  }

  /**
   * Update a custom agent
   */
  static async update(
    userId: string,
    agentId: string,
    data: UpdateAgentInput
  ): Promise<AgentItem | null> {
    // Cannot update system agents
    const systemAgents = await getSystemAgentsFromDB();
    if (systemAgents[agentId]) {
      throw new Error('Cannot update system agents');
    }

    await connectDB();

    const updateData: Partial<IAgent> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.modelName !== undefined) updateData.modelName = data.modelName;
    if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.ui_color !== undefined) updateData.ui_color = data.ui_color;
    if (data.systemInstruction !== undefined) updateData.systemInstruction = data.systemInstruction;

    const agent = await Agent.findOneAndUpdate(
      { user_id: userId, agent_id: agentId },
      updateData,
      { new: true }
    ).lean();

    if (!agent) return null;

    return {
      id: agent.agent_id,
      name: agent.name,
      model: agent.modelName,
      avatar_url: agent.avatar_url,
      description: agent.description,
      ui_color: agent.ui_color,
      systemInstruction: agent.systemInstruction,
      isCustom: true,
      isSystem: false,
    };
  }

  /**
   * Delete a custom agent
   */
  static async delete(userId: string, agentId: string): Promise<boolean> {
    // Cannot delete system agents
    const systemAgents = await getSystemAgentsFromDB();
    if (systemAgents[agentId]) {
      throw new Error('Cannot delete system agents');
    }

    await connectDB();

    const result = await Agent.deleteOne({
      user_id: userId,
      agent_id: agentId,
    });

    return result.deletedCount === 1;
  }

  /**
   * Check if an agent exists (system or custom)
   */
  static async exists(userId: string, agentId: string): Promise<boolean> {
    await connectDB();

    // Check system agents first (from DB or fallback)
    const systemAgents = await getSystemAgentsFromDB();
    if (systemAgents[agentId]) {
      return true;
    }

    // Check custom agents
    const agent = await Agent.findOne(
      { user_id: userId, agent_id: agentId },
      { _id: 1 }
    ).lean();

    return agent !== null;
  }

  /**
   * Get all system agents (for direct access without user context)
   */
  static async getSystemAgents(): Promise<Record<string, AgentItem>> {
    return getSystemAgentsFromDB();
  }
}
