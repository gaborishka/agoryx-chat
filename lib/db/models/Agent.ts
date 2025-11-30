import mongoose, { Schema, Document, Model } from 'mongoose';

export type UiColor =
  | 'blue'
  | 'amber'
  | 'purple'
  | 'green'
  | 'teal'
  | 'pink'
  | 'rose'
  | 'emerald'
  | 'slate'
  | 'indigo'
  | 'orange'
  | 'cyan';

export interface IAgent extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  agent_id: string; // Unique identifier for the agent within user's scope
  name: string;
  modelName: string; // renamed from 'model' to avoid Mongoose reserved property conflict
  avatar_url?: string;
  description?: string;
  ui_color: UiColor;
  systemInstruction?: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agent_id: { type: String, required: true },
    name: { type: String, required: true },
    modelName: { type: String, required: true },
    avatar_url: { type: String },
    description: { type: String },
    ui_color: {
      type: String,
      enum: ['blue', 'amber', 'purple', 'green', 'teal', 'pink', 'rose', 'emerald', 'slate', 'indigo', 'orange', 'cyan'],
      default: 'indigo',
    },
    systemInstruction: { type: String },
    isCustom: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique compound index: one agent_id per user
AgentSchema.index({ user_id: 1, agent_id: 1 }, { unique: true });

const Agent: Model<IAgent> =
  mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);

export default Agent;
