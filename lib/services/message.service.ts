import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import Message, { IMessage, IAttachment } from '@/lib/db/models/Message';
import { ConversationService } from './conversation.service';
import { CreateMessageInput, UpdateMessageInput, PaginationInput } from '@/lib/validations';

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'agent';
  sender_id: string;
  content: string;
  metadata?: {
    relatedToMessageId?: string;
    isThinking?: boolean;
  };
  attachments?: IAttachment[];
  cost?: number;
  feedback?: 'up' | 'down';
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export class MessageService {
  /**
   * List messages for a conversation (paginated)
   */
  static async list(
    conversationId: string,
    pagination: PaginationInput,
    order: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedResult<MessageItem>> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { data: [], total: 0, page: pagination.page, totalPages: 0 };
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [messages, total] = await Promise.all([
      Message.find({ conversation_id: conversationId })
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversation_id: conversationId }),
    ]);

    return {
      data: messages.map((m) => ({
        id: m._id.toString(),
        conversation_id: m.conversation_id.toString(),
        sender_type: m.sender_type,
        sender_id: m.sender_id,
        content: m.content,
        metadata: m.metadata,
        attachments: m.attachments,
        cost: m.cost,
        feedback: m.feedback,
        isPinned: m.isPinned,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a user message
   */
  static async create(
    conversationId: string,
    senderId: string,
    data: CreateMessageInput
  ): Promise<MessageItem> {
    await connectDB();

    const message = await Message.create({
      conversation_id: new mongoose.Types.ObjectId(conversationId),
      sender_type: 'user',
      sender_id: senderId,
      content: data.content,
      attachments: data.attachments,
    });

    // Update conversation preview
    await ConversationService.updatePreview(conversationId, data.content);

    return {
      id: message._id.toString(),
      conversation_id: message.conversation_id.toString(),
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      content: message.content,
      metadata: message.metadata,
      attachments: message.attachments,
      cost: message.cost,
      feedback: message.feedback,
      isPinned: message.isPinned,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Create an agent message (used by orchestration service)
   */
  static async createAgentMessage(
    conversationId: string,
    agentId: string,
    content: string,
    options?: {
      relatedToMessageId?: string;
      cost?: number;
    }
  ): Promise<MessageItem> {
    await connectDB();

    const message = await Message.create({
      conversation_id: new mongoose.Types.ObjectId(conversationId),
      sender_type: 'agent',
      sender_id: agentId,
      content,
      metadata: options?.relatedToMessageId
        ? { relatedToMessageId: options.relatedToMessageId }
        : undefined,
      cost: options?.cost,
    });

    return {
      id: message._id.toString(),
      conversation_id: message.conversation_id.toString(),
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      content: message.content,
      metadata: message.metadata,
      attachments: message.attachments,
      cost: message.cost,
      feedback: message.feedback,
      isPinned: message.isPinned,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Update message content (used for streaming updates)
   */
  static async updateContent(messageId: string, content: string): Promise<void> {
    await connectDB();

    await Message.updateOne({ _id: messageId }, { content });
  }

  /**
   * Update message feedback
   */
  static async updateFeedback(
    messageId: string,
    feedback: 'up' | 'down' | null
  ): Promise<MessageItem | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return null;
    }

    const updateData = feedback === null
      ? { $unset: { feedback: 1 } }
      : { feedback };

    const message = await Message.findByIdAndUpdate(messageId, updateData, {
      new: true,
    }).lean();

    if (!message) return null;

    return {
      id: message._id.toString(),
      conversation_id: message.conversation_id.toString(),
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      content: message.content,
      metadata: message.metadata,
      attachments: message.attachments,
      cost: message.cost,
      feedback: message.feedback,
      isPinned: message.isPinned,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Toggle message pin status
   */
  static async togglePin(messageId: string): Promise<MessageItem | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return null;
    }

    const message = await Message.findById(messageId);
    if (!message) return null;

    message.isPinned = !message.isPinned;
    await message.save();

    return {
      id: message._id.toString(),
      conversation_id: message.conversation_id.toString(),
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      content: message.content,
      metadata: message.metadata,
      attachments: message.attachments,
      cost: message.cost,
      feedback: message.feedback,
      isPinned: message.isPinned,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Get message by ID
   */
  static async getById(messageId: string): Promise<MessageItem | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return null;
    }

    const message = await Message.findById(messageId).lean();
    if (!message) return null;

    return {
      id: message._id.toString(),
      conversation_id: message.conversation_id.toString(),
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      content: message.content,
      metadata: message.metadata,
      attachments: message.attachments,
      cost: message.cost,
      feedback: message.feedback,
      isPinned: message.isPinned,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Get the conversation ID for a message (used for ownership check)
   */
  static async getConversationId(messageId: string): Promise<string | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return null;
    }

    const message = await Message.findById(messageId, 'conversation_id').lean();
    return message ? message.conversation_id.toString() : null;
  }
}
