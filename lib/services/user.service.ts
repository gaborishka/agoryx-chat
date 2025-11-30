import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import User, { IUser } from '@/lib/db/models/User';
import UsageLog from '@/lib/db/models/UsageLog';
import { UpdateUserInput } from '@/lib/validations';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string;
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  role: 'user' | 'admin';
  is_banned: boolean;
  createdAt: Date;
}

export interface UserCreditsInfo {
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  recentUsage: {
    total_tokens: number;
    total_cost: number;
    count: number;
  };
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    await connectDB();

    const user = await User.findById(userId).lean();
    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      credits_remaining: user.credits_remaining,
      subscription_tier: user.subscription_tier,
      role: user.role,
      is_banned: user.is_banned,
      createdAt: user.createdAt,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: UpdateUserInput
  ): Promise<UserProfile | null> {
    await connectDB();

    // Check email uniqueness if updating email
    if (data.email) {
      const existingUser = await User.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    const updateData: Partial<IUser> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.toLowerCase();

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).lean();

    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      credits_remaining: user.credits_remaining,
      subscription_tier: user.subscription_tier,
      role: user.role,
      is_banned: user.is_banned,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get user credits and usage stats
   */
  static async getCreditsAndUsage(userId: string): Promise<UserCreditsInfo | null> {
    await connectDB();

    const user = await User.findById(userId).lean();
    if (!user) return null;

    // Get recent usage from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageAggregation = await UsageLog.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          total_tokens: { $sum: '$tokens_used' },
          total_cost: { $sum: '$cost' },
          count: { $sum: 1 },
        },
      },
    ]);

    const recentUsage = usageAggregation[0] || {
      total_tokens: 0,
      total_cost: 0,
      count: 0,
    };

    return {
      credits_remaining: user.credits_remaining,
      subscription_tier: user.subscription_tier,
      subscription_status: user.subscription_status,
      current_period_end: user.current_period_end,
      cancel_at_period_end: user.cancel_at_period_end,
      recentUsage: {
        total_tokens: recentUsage.total_tokens,
        total_cost: recentUsage.total_cost,
        count: recentUsage.count,
      },
    };
  }

  /**
   * Deduct credits from user (atomic operation)
   */
  static async deductCredits(userId: string, amount: number): Promise<boolean> {
    await connectDB();

    const result = await User.updateOne(
      { _id: userId, credits_remaining: { $gte: amount } },
      { $inc: { credits_remaining: -amount } }
    );

    return result.modifiedCount === 1;
  }

  /**
   * Check if user has enough credits
   */
  static async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    await connectDB();

    const user = await User.findById(userId, 'credits_remaining').lean();
    return user ? user.credits_remaining >= amount : false;
  }
}
