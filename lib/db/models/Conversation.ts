import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConversationAgentConfig {
  system1Id: string;
  system2Id: string;
  proponentId?: string;
  opponentId?: string;
  moderatorId?: string;
  councilIds?: string[];
}

export interface IConversationSettings {
  extendedDebate: boolean;
  autoScroll: boolean;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  title: string;
  preview: string;
  mode: 'collaborative' | 'parallel' | 'expert-council' | 'debate';
  agentConfig: IConversationAgentConfig;
  enableAutoReply: boolean;
  settings: IConversationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationAgentConfigSchema = new Schema<IConversationAgentConfig>(
  {
    system1Id: { type: String, default: 'flash' },
    system2Id: { type: String, default: 'sage' },
    proponentId: { type: String },
    opponentId: { type: String },
    moderatorId: { type: String },
    councilIds: [{ type: String }],
  },
  { _id: false }
);

const ConversationSettingsSchema = new Schema<IConversationSettings>(
  {
    extendedDebate: { type: Boolean, default: false },
    autoScroll: { type: Boolean, default: true },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, default: 'New Chat' },
    preview: { type: String, default: '' },
    mode: {
      type: String,
      enum: ['collaborative', 'parallel', 'expert-council', 'debate'],
      default: 'collaborative',
    },
    agentConfig: {
      type: ConversationAgentConfigSchema,
      default: () => ({ system1Id: 'flash', system2Id: 'sage' }),
    },
    enableAutoReply: { type: Boolean, default: false },
    settings: {
      type: ConversationSettingsSchema,
      default: () => ({ extendedDebate: false, autoScroll: true }),
    },
  },
  { timestamps: true }
);

// Compound index for efficient user conversation listing
ConversationSchema.index({ user_id: 1, updatedAt: -1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;
