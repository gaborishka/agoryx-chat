import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearTestDB } from '../../mocks/db';
import { AgentService } from '@/lib/services/agent.service';
import Agent from '@/lib/db/models/Agent';
import { createTestUser } from '../../mocks/factories/user.factory';
import User from '@/lib/db/models/User';
import { SYSTEM_AGENTS } from '@/scripts/seed/data/agents.data';

// Mock the connectDB to avoid connecting to real DB
vi.mock('@/lib/db/mongoose', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('AgentService Integration Tests', () => {
  let testUserId: string;
  let testUserId2: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  beforeAll(async () => {
    // Create test users before each test
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTestDB();

    // Create test users
    const user1 = await User.create(createTestUser({ email: 'user1@test.com' }));
    const user2 = await User.create(createTestUser({ email: 'user2@test.com' }));
    testUserId = user1._id.toString();
    testUserId2 = user2._id.toString();
  });

  describe('listAll', () => {
    it('should return all system agents when user has no custom agents', async () => {
      const agents = await AgentService.listAll(testUserId);

      // Should have all system agents
      const systemAgentCount = SYSTEM_AGENTS.length;
      expect(agents.length).toBe(systemAgentCount);

      // All should be marked as system agents
      agents.forEach((agent) => {
        expect(agent.isSystem).toBe(true);
        expect(agent.isCustom).toBe(false);
      });
    });

    it('should return system agents first, then custom agents', async () => {
      // Create a custom agent
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'my-custom-agent',
        name: 'My Custom Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const agents = await AgentService.listAll(testUserId);

      const systemAgentCount = SYSTEM_AGENTS.length;
      expect(agents.length).toBe(systemAgentCount + 1);

      // System agents should be first
      const systemAgents = agents.slice(0, systemAgentCount);
      systemAgents.forEach((agent) => {
        expect(agent.isSystem).toBe(true);
      });

      // Custom agent should be last
      const customAgent = agents[agents.length - 1];
      expect(customAgent.isCustom).toBe(true);
      expect(customAgent.id).toBe('my-custom-agent');
    });

    it('should only return custom agents for the specific user', async () => {
      // Create custom agents for different users
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'user1-agent',
        name: 'User 1 Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId2),
        agent_id: 'user2-agent',
        name: 'User 2 Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'green',
      });

      const user1Agents = await AgentService.listAll(testUserId);
      const user2Agents = await AgentService.listAll(testUserId2);

      const user1Custom = user1Agents.filter((a) => a.isCustom);
      const user2Custom = user2Agents.filter((a) => a.isCustom);

      expect(user1Custom).toHaveLength(1);
      expect(user1Custom[0].id).toBe('user1-agent');

      expect(user2Custom).toHaveLength(1);
      expect(user2Custom[0].id).toBe('user2-agent');
    });

    it('should correctly map model field from modelName', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'model-test',
        name: 'Model Test Agent',
        modelName: 'gemini-3-pro-preview',
        ui_color: 'purple',
      });

      const agents = await AgentService.listAll(testUserId);
      const customAgent = agents.find((a) => a.id === 'model-test');

      expect(customAgent).toBeDefined();
      expect(customAgent!.model).toBe('gemini-3-pro-preview');
    });
  });

  describe('getById', () => {
    it('should return system agent by ID', async () => {
      const agent = await AgentService.getById(testUserId, 'flash');

      expect(agent).not.toBeNull();
      expect(agent!.id).toBe('flash');
      expect(agent!.name).toBe('Flash');
      expect(agent!.isSystem).toBe(true);
      expect(agent!.isCustom).toBe(false);
    });

    it('should return custom agent by ID for owner', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'my-custom',
        name: 'My Custom',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
        description: 'A custom agent',
      });

      const agent = await AgentService.getById(testUserId, 'my-custom');

      expect(agent).not.toBeNull();
      expect(agent!.id).toBe('my-custom');
      expect(agent!.name).toBe('My Custom');
      expect(agent!.isCustom).toBe(true);
      expect(agent!.description).toBe('A custom agent');
    });

    it('should return null for non-existent agent', async () => {
      const agent = await AgentService.getById(testUserId, 'nonexistent');
      expect(agent).toBeNull();
    });

    it('should return null for custom agent not owned by user', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId2),
        agent_id: 'other-user-agent',
        name: 'Other User Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const agent = await AgentService.getById(testUserId, 'other-user-agent');
      expect(agent).toBeNull();
    });

    it('should allow any user to access system agents', async () => {
      const agent = await AgentService.getById(testUserId2, 'sage');

      expect(agent).not.toBeNull();
      expect(agent!.id).toBe('sage');
      expect(agent!.isSystem).toBe(true);
    });
  });

  describe('createCustom', () => {
    it('should create a custom agent with valid data', async () => {
      const result = await AgentService.createCustom(testUserId, {
        agent_id: 'new-agent',
        name: 'New Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
        description: 'A brand new agent',
        systemInstruction: 'You are helpful',
      });

      expect(result.id).toBe('new-agent');
      expect(result.name).toBe('New Agent');
      expect(result.model).toBe('gemini-2.5-flash');
      expect(result.ui_color).toBe('blue');
      expect(result.description).toBe('A brand new agent');
      expect(result.systemInstruction).toBe('You are helpful');
      expect(result.isCustom).toBe(true);
      expect(result.isSystem).toBe(false);

      // Verify in database
      const dbAgent = await Agent.findOne({ agent_id: 'new-agent' });
      expect(dbAgent).not.toBeNull();
    });

    it('should reject creation with system agent ID', async () => {
      await expect(
        AgentService.createCustom(testUserId, {
          agent_id: 'flash', // System agent ID
          name: 'Fake Flash',
          modelName: 'gemini-2.5-flash',
          ui_color: 'blue',
        })
      ).rejects.toThrow('Agent ID conflicts with a system agent');
    });

    it('should reject creation with duplicate agent_id for same user', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'existing-agent',
        name: 'Existing Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      await expect(
        AgentService.createCustom(testUserId, {
          agent_id: 'existing-agent',
          name: 'Duplicate',
          modelName: 'gemini-2.5-flash',
          ui_color: 'green',
        })
      ).rejects.toThrow('An agent with this ID already exists');
    });

    it('should allow same agent_id for different users', async () => {
      await AgentService.createCustom(testUserId, {
        agent_id: 'shared-id',
        name: 'User 1 Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.createCustom(testUserId2, {
        agent_id: 'shared-id',
        name: 'User 2 Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'green',
      });

      expect(result.id).toBe('shared-id');
      expect(result.name).toBe('User 2 Agent');
    });

    it('should create agent with optional fields omitted', async () => {
      const result = await AgentService.createCustom(testUserId, {
        agent_id: 'minimal-agent',
        name: 'Minimal',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      expect(result.id).toBe('minimal-agent');
      expect(result.description).toBeUndefined();
      expect(result.avatar_url).toBeUndefined();
      expect(result.systemInstruction).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update custom agent name', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'update-test',
        name: 'Original Name',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.update(testUserId, 'update-test', {
        name: 'Updated Name',
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Name');
      expect(result!.ui_color).toBe('blue'); // Unchanged
    });

    it('should update multiple fields', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'multi-update',
        name: 'Original',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
        description: 'Old description',
      });

      const result = await AgentService.update(testUserId, 'multi-update', {
        name: 'New Name',
        ui_color: 'purple',
        description: 'New description',
        modelName: 'gemini-3-pro-preview',
      });

      expect(result).not.toBeNull();
      expect(result!.name).toBe('New Name');
      expect(result!.ui_color).toBe('purple');
      expect(result!.description).toBe('New description');
      expect(result!.model).toBe('gemini-3-pro-preview');
    });

    it('should throw error when trying to update system agent', async () => {
      await expect(
        AgentService.update(testUserId, 'flash', { name: 'Hacked Flash' })
      ).rejects.toThrow('Cannot update system agents');
    });

    it('should return null for non-existent agent', async () => {
      const result = await AgentService.update(testUserId, 'nonexistent', {
        name: 'Test',
      });
      expect(result).toBeNull();
    });

    it('should return null when updating agent not owned by user', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId2),
        agent_id: 'other-agent',
        name: 'Other User Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.update(testUserId, 'other-agent', {
        name: 'Hijacked',
      });
      expect(result).toBeNull();

      // Verify original unchanged
      const dbAgent = await Agent.findOne({ agent_id: 'other-agent' });
      expect(dbAgent!.name).toBe('Other User Agent');
    });
  });

  describe('delete', () => {
    it('should delete custom agent', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'delete-me',
        name: 'Delete Me',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.delete(testUserId, 'delete-me');
      expect(result).toBe(true);

      // Verify deleted
      const dbAgent = await Agent.findOne({ agent_id: 'delete-me' });
      expect(dbAgent).toBeNull();
    });

    it('should throw error when trying to delete system agent', async () => {
      await expect(AgentService.delete(testUserId, 'flash')).rejects.toThrow(
        'Cannot delete system agents'
      );
    });

    it('should return false for non-existent agent', async () => {
      const result = await AgentService.delete(testUserId, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should return false when deleting agent not owned by user', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId2),
        agent_id: 'protected-agent',
        name: 'Protected',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.delete(testUserId, 'protected-agent');
      expect(result).toBe(false);

      // Verify not deleted
      const dbAgent = await Agent.findOne({ agent_id: 'protected-agent' });
      expect(dbAgent).not.toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for system agent', async () => {
      const result = await AgentService.exists(testUserId, 'flash');
      expect(result).toBe(true);
    });

    it('should return true for custom agent owned by user', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'my-agent',
        name: 'My Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.exists(testUserId, 'my-agent');
      expect(result).toBe(true);
    });

    it('should return false for non-existent agent', async () => {
      const result = await AgentService.exists(testUserId, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should return false for custom agent not owned by user', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId2),
        agent_id: 'other-agent',
        name: 'Other Agent',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const result = await AgentService.exists(testUserId, 'other-agent');
      expect(result).toBe(false);
    });

    it('should return true for all system agent IDs', async () => {
      for (const agent of SYSTEM_AGENTS) {
        const result = await AgentService.exists(testUserId, agent.agent_id);
        expect(result).toBe(true);
      }
    });
  });

  describe('Field Mapping', () => {
    it('should correctly map id from agent_id', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'test-id-mapping',
        name: 'Test',
        modelName: 'gemini-2.5-flash',
        ui_color: 'blue',
      });

      const agent = await AgentService.getById(testUserId, 'test-id-mapping');
      expect(agent!.id).toBe('test-id-mapping');
    });

    it('should correctly map model from modelName', async () => {
      await Agent.create({
        user_id: new mongoose.Types.ObjectId(testUserId),
        agent_id: 'test-model-mapping',
        name: 'Test',
        modelName: 'custom-model-123',
        ui_color: 'blue',
      });

      const agent = await AgentService.getById(testUserId, 'test-model-mapping');
      expect(agent!.model).toBe('custom-model-123');
    });

    it('should preserve all UI colors', async () => {
      const colors = ['blue', 'amber', 'purple', 'green', 'teal', 'pink', 'rose', 'emerald', 'slate', 'indigo', 'orange', 'cyan'] as const;

      for (const color of colors) {
        const agentId = `color-test-${color}`;
        await Agent.create({
          user_id: new mongoose.Types.ObjectId(testUserId),
          agent_id: agentId,
          name: `Color ${color}`,
          modelName: 'gemini-2.5-flash',
          ui_color: color,
        });

        const agent = await AgentService.getById(testUserId, agentId);
        expect(agent!.ui_color).toBe(color);
      }
    });
  });
});
