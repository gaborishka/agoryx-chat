import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUsageLog extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  conversation_id?: mongoose.Types.ObjectId;
  message_id?: mongoose.Types.ObjectId;
  agent_id?: string;
  tokens_used: number;
  cost: number;
  modelName?: string; // renamed from 'model' to avoid Mongoose reserved property conflict
  createdAt: Date;
  updatedAt: Date;
}

const UsageLogSchema = new Schema<IUsageLog>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversation_id: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    message_id: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    agent_id: { type: String },
    tokens_used: { type: Number, required: true },
    cost: { type: Number, required: true },
    modelName: { type: String },
  },
  { timestamps: true }
);

// Index for user usage stats queries
UsageLogSchema.index({ user_id: 1, createdAt: -1 });

const UsageLog: Model<IUsageLog> =
  mongoose.models.UsageLog || mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);

export default UsageLog;
