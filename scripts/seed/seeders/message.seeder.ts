import mongoose from 'mongoose';
import Message, { IMessage } from '@/lib/db/models/Message';
import { BaseSeeder } from './base.seeder';
import { DEMO_MESSAGES, MessageSeedData } from '../data/conversations.data';
import { ConversationSeeder } from './conversation.seeder';
import { generateSeedId } from '../utils';

/**
 * Message seeder - seeds demo messages for conversations
 */
export class MessageSeeder extends BaseSeeder<MessageSeedData, IMessage> {
  private conversationSeeder: ConversationSeeder;
  private messageIdMap: Map<string, mongoose.Types.ObjectId> = new Map();

  constructor(conversationSeeder: ConversationSeeder) {
    super('Messages', 'mesg');
    this.conversationSeeder = conversationSeeder;
  }

  getData(): MessageSeedData[] {
    return DEMO_MESSAGES;
  }

  async seed(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const msgData of this.getData()) {
      // Generate deterministic ID
      const seedId = generateSeedId(this.seedPrefix, msgData.seedId);

      // Check if already exists
      const existing = await Message.findById(seedId);
      if (existing) {
        this.messageIdMap.set(msgData.seedId, existing._id);
        this.logSkip(`Message ${msgData.seedId}`);
        skipped++;
        continue;
      }

      // Get conversation ID
      const conversationId = await this.conversationSeeder.lookupConversationId(
        msgData.conversationSeedId
      );
      if (!conversationId) {
        this.logSkip(`Message ${msgData.seedId} (conversation ${msgData.conversationSeedId} not found)`);
        skipped++;
        continue;
      }

      // Build metadata
      const metadata: { relatedToMessageId?: string } = {};
      if (msgData.relatedToSeedId) {
        const relatedId = this.messageIdMap.get(msgData.relatedToSeedId);
        if (relatedId) {
          metadata.relatedToMessageId = relatedId.toString();
        }
      }

      const message = await Message.create({
        _id: seedId,
        conversation_id: conversationId,
        sender_type: msgData.sender_type,
        sender_id: msgData.sender_id,
        content: msgData.content,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      this.messageIdMap.set(msgData.seedId, message._id);
      this.logCreate(`${msgData.sender_type}:${msgData.sender_id.split('@')[0]}`);
      created++;
    }

    this.logSummary(created, skipped);
    return { created, skipped };
  }

  async clear(): Promise<number> {
    const seedIds = this.getData().map((m) => generateSeedId(this.seedPrefix, m.seedId));
    const result = await Message.deleteMany({ _id: { $in: seedIds } });
    return result.deletedCount;
  }
}
