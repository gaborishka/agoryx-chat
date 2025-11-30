import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttachment {
  type: 'image' | 'file';
  url?: string;
  mimeType: string;
  name: string;
  data?: string; // Base64 data
  textContent?: string; // Raw text content for code/text files
}

export interface IMessageMetadata {
  relatedToMessageId?: string;
  isThinking?: boolean;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation_id: mongoose.Types.ObjectId;
  sender_type: 'user' | 'agent';
  sender_id: string;
  content: string;
  metadata?: IMessageMetadata;
  attachments?: IAttachment[];
  cost?: number;
  feedback?: 'up' | 'down';
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    type: { type: String, enum: ['image', 'file'], required: true },
    url: { type: String },
    mimeType: { type: String, required: true },
    name: { type: String, required: true },
    data: { type: String },
    textContent: { type: String },
  },
  { _id: false }
);

const MessageMetadataSchema = new Schema<IMessageMetadata>(
  {
    relatedToMessageId: { type: String },
    isThinking: { type: Boolean, default: false },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender_type: {
      type: String,
      enum: ['user', 'agent'],
      required: true,
    },
    sender_id: { type: String, required: true },
    content: { type: String, default: '' },
    metadata: { type: MessageMetadataSchema },
    attachments: [AttachmentSchema],
    cost: { type: Number, default: 0 },
    feedback: { type: String, enum: ['up', 'down'] },
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient message retrieval by conversation
MessageSchema.index({ conversation_id: 1, createdAt: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
