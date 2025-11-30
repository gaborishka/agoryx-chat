import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Conversation, { IConversation } from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import { CreateConversationInput, UpdateConversationInput, PaginationInput } from '@/lib/validations';

export interface ConversationListItem {
  id: string;
  title: string;
  preview: string;
  mode: 'collaborative' | 'parallel' | 'expert-council' | 'debate';
  updatedAt: Date;
  createdAt: Date;
}

export interface ConversationDetail {
  id: string;
  title: string;
  preview: string;
  mode: 'collaborative' | 'parallel' | 'expert-council' | 'debate';
  agentConfig: {
    system1Id: string;
    system2Id: string;
    proponentId?: string;
    opponentId?: string;
    moderatorId?: string;
    councilIds?: string[];
  };
  enableAutoReply: boolean;
  settings: {
    extendedDebate: boolean;
    autoScroll: boolean;
  };
  updatedAt: Date;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export class ConversationService {
  /**
   * List user's conversations (paginated)
   */
  static async list(
    userId: string,
    pagination: PaginationInput
  ): Promise<PaginatedResult<ConversationListItem>> {
    await connectDB();

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find({ user_id: userId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments({ user_id: userId }),
    ]);

    return {
      data: conversations.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        preview: c.preview,
        mode: c.mode,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new conversation
   */
  static async create(
    userId: string,
    data: CreateConversationInput
  ): Promise<ConversationDetail> {
    await connectDB();

    const conversation = await Conversation.create({
      user_id: new mongoose.Types.ObjectId(userId),
      title: data.title || 'New Chat',
      mode: data.mode || 'collaborative',
      agentConfig: data.agentConfig || { system1Id: 'flash', system2Id: 'sage' },
      enableAutoReply: data.enableAutoReply ?? false,
      settings: data.settings || { extendedDebate: false, autoScroll: true },
    });

    return {
      id: conversation._id.toString(),
      title: conversation.title,
      preview: conversation.preview,
      mode: conversation.mode,
      agentConfig: conversation.agentConfig,
      enableAutoReply: conversation.enableAutoReply,
      settings: conversation.settings,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Get conversation by ID (with ownership check)
   */
  static async getById(
    userId: string,
    conversationId: string
  ): Promise<ConversationDetail | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return null;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      user_id: userId,
    }).lean();

    if (!conversation) return null;

    return {
      id: conversation._id.toString(),
      title: conversation.title,
      preview: conversation.preview,
      mode: conversation.mode,
      agentConfig: conversation.agentConfig,
      enableAutoReply: conversation.enableAutoReply,
      settings: conversation.settings,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Update conversation (with ownership check)
   */
  static async update(
    userId: string,
    conversationId: string,
    data: UpdateConversationInput
  ): Promise<ConversationDetail | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return null;
    }

    const updateData: Partial<IConversation> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.agentConfig !== undefined) updateData.agentConfig = data.agentConfig;
    if (data.enableAutoReply !== undefined) updateData.enableAutoReply = data.enableAutoReply;
    if (data.settings !== undefined) updateData.settings = data.settings as IConversation['settings'];

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, user_id: userId },
      updateData,
      { new: true }
    ).lean();

    if (!conversation) return null;

    return {
      id: conversation._id.toString(),
      title: conversation.title,
      preview: conversation.preview,
      mode: conversation.mode,
      agentConfig: conversation.agentConfig,
      enableAutoReply: conversation.enableAutoReply,
      settings: conversation.settings,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Delete conversation and all its messages (with ownership check)
   */
  static async delete(userId: string, conversationId: string): Promise<boolean> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return false;
    }

    const conversation = await Conversation.findOneAndDelete({
      _id: conversationId,
      user_id: userId,
    });

    if (!conversation) return false;

    // Delete all messages in this conversation
    await Message.deleteMany({ conversation_id: conversationId });

    return true;
  }

  /**
   * Update conversation preview (called when a new message is added)
   */
  static async updatePreview(conversationId: string, preview: string): Promise<void> {
    await connectDB();

    const truncatedPreview = preview.length > 100 ? preview.substring(0, 100) + '...' : preview;

    await Conversation.updateOne(
      { _id: conversationId },
      { preview: truncatedPreview }
    );
  }

  /**
   * Check if user owns a conversation
   */
  static async isOwner(userId: string, conversationId: string): Promise<boolean> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return false;
    }

    const conversation = await Conversation.findOne(
      { _id: conversationId, user_id: userId },
      { _id: 1 }
    ).lean();

    return conversation !== null;
  }
}
