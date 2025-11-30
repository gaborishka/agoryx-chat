import mongoose from 'mongoose';
import Conversation, { IConversation } from '@/lib/db/models/Conversation';
import { BaseSeeder } from './base.seeder';
import { DEMO_CONVERSATIONS, ConversationSeedData } from '../data/conversations.data';
import { UserSeeder } from './user.seeder';
import { generateSeedId } from '../utils';

/**
 * Conversation seeder - seeds demo conversations
 */
export class ConversationSeeder extends BaseSeeder<ConversationSeedData, IConversation> {
  private userSeeder: UserSeeder;
  private conversationIdMap: Map<string, mongoose.Types.ObjectId> = new Map();

  constructor(userSeeder: UserSeeder) {
    super('Conversations', 'conv');
    this.userSeeder = userSeeder;
  }

  getData(): ConversationSeedData[] {
    return DEMO_CONVERSATIONS;
  }

  async seed(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const convData of this.getData()) {
      // Generate deterministic ID
      const seedId = generateSeedId(this.seedPrefix, convData.seedId);

      // Check if already exists
      const existing = await Conversation.findById(seedId);
      if (existing) {
        this.conversationIdMap.set(convData.seedId, existing._id);
        this.logSkip(convData.title);
        skipped++;
        continue;
      }

      // Get user ID
      const userId = await this.userSeeder.lookupUserId(convData.userEmail);
      if (!userId) {
        this.logSkip(`${convData.title} (user ${convData.userEmail} not found)`);
        skipped++;
        continue;
      }

      const conversation = await Conversation.create({
        _id: seedId,
        user_id: userId,
        title: convData.title,
        preview: convData.preview,
        mode: convData.mode,
        agentConfig: convData.agentConfig,
        enableAutoReply: convData.enableAutoReply,
        settings: {
          extendedDebate: false,
          autoScroll: true,
        },
      });

      this.conversationIdMap.set(convData.seedId, conversation._id);
      this.logCreate(convData.title);
      created++;
    }

    this.logSummary(created, skipped);
    return { created, skipped };
  }

  async clear(): Promise<number> {
    const seedIds = this.getData().map((c) => generateSeedId(this.seedPrefix, c.seedId));
    const result = await Conversation.deleteMany({ _id: { $in: seedIds } });
    return result.deletedCount;
  }

  /**
   * Get conversation ID by seed ID
   */
  getConversationId(seedId: string): mongoose.Types.ObjectId | undefined {
    return this.conversationIdMap.get(seedId);
  }

  /**
   * Lookup conversation ID, generating from seed if not cached
   */
  async lookupConversationId(seedId: string): Promise<mongoose.Types.ObjectId | null> {
    const cached = this.conversationIdMap.get(seedId);
    if (cached) return cached;

    const generatedId = generateSeedId(this.seedPrefix, seedId);
    const conversation = await Conversation.findById(generatedId);
    if (conversation) {
      this.conversationIdMap.set(seedId, conversation._id);
      return conversation._id;
    }

    return null;
  }
}
