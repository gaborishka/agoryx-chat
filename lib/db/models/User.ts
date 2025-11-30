import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  // NextAuth fields
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string; // hashed, for credentials auth

  // App-specific fields
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  role: 'user' | 'admin';
  is_banned: boolean;

  // Stripe fields
  stripe_customer_id?: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_end?: Date;
  cancel_at_period_end: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // NextAuth fields
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String }, // hashed with bcrypt

    // App-specific fields
    credits_remaining: { type: Number, default: 100 },
    subscription_tier: {
      type: String,
      enum: ['free', 'basic', 'pro'],
      default: 'free',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    is_banned: { type: Boolean, default: false },

    // Stripe fields
    stripe_customer_id: { type: String },
    subscription_status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
      default: 'active',
    },
    current_period_end: { type: Date },
    cancel_at_period_end: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Note: email index is created automatically via `unique: true` on the field

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
