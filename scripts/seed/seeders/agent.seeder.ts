import mongoose from 'mongoose';
import Agent, { IAgent } from '@/lib/db/models/Agent';
import { BaseSeeder } from './base.seeder';
import { SYSTEM_AGENTS, AgentSeedData } from '../data/agents.data';
import { UserSeeder } from './user.seeder';
import { SYSTEM_USER_EMAIL } from '../data/users.data';

/**
 * Agent seeder - seeds system agents owned by the system user
 * All users can access these agents
 */
export class AgentSeeder extends BaseSeeder<AgentSeedData, IAgent> {
  private userSeeder: UserSeeder;

  constructor(userSeeder: UserSeeder) {
    super('Agents', 'agnt');
    this.userSeeder = userSeeder;
  }

  getData(): AgentSeedData[] {
    return SYSTEM_AGENTS;
  }

  async seed(): Promise<{ created: number; skipped: number }> {
    // Get system user ID
    let systemUserId = this.userSeeder.getSystemUserId();

    // If not in cache, look it up
    if (!systemUserId) {
      systemUserId = (await this.userSeeder.lookupUserId(SYSTEM_USER_EMAIL)) || undefined;
    }

    if (!systemUserId) {
      throw new Error('System user must be seeded before agents. Run user seeder first.');
    }

    let created = 0;
    let skipped = 0;

    for (const agentData of this.getData()) {
      const existing = await Agent.findOne({
        user_id: systemUserId,
        agent_id: agentData.agent_id,
      });

      if (existing) {
        this.logSkip(agentData.agent_id);
        skipped++;
        continue;
      }

      await Agent.create({
        user_id: systemUserId,
        agent_id: agentData.agent_id,
        name: agentData.name,
        modelName: agentData.modelName,
        avatar_url: agentData.avatar_url,
        description: agentData.description,
        ui_color: agentData.ui_color,
        systemInstruction: agentData.systemInstruction,
        isCustom: false,
      });

      this.logCreate(agentData.agent_id);
      created++;
    }

    this.logSummary(created, skipped);
    return { created, skipped };
  }

  async clear(): Promise<number> {
    // Get system user ID
    let systemUserId: mongoose.Types.ObjectId | null = this.userSeeder.getSystemUserId() || null;

    if (!systemUserId) {
      systemUserId = await this.userSeeder.lookupUserId(SYSTEM_USER_EMAIL);
    }

    if (!systemUserId) {
      return 0;
    }

    const agentIds = this.getData().map((a) => a.agent_id);
    const result = await Agent.deleteMany({
      user_id: systemUserId,
      agent_id: { $in: agentIds },
    });

    return result.deletedCount;
  }
}
