import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';
import Conversation from '@/lib/db/models/Conversation';
import Message from '@/lib/db/models/Message';
import UsageLog from '@/lib/db/models/UsageLog';
import {
  AdminUpdateUserInput,
  AdminUserFilters,
  UsageLogFilters,
  PaginationInput,
} from '@/lib/validations';

export interface AdminStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalCreditsDistributed: number;
  totalTokensUsed: number;
  totalCost: number;
  usersByTier: {
    free: number;
    basic: number;
    pro: number;
  };
  usersByRole: {
    user: number;
    admin: number;
  };
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  image?: string;
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  role: 'user' | 'admin';
  is_banned: boolean;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  createdAt: Date;
}

export interface UsageLogItem {
  id: string;
  user_id: string;
  conversation_id?: string;
  message_id?: string;
  agent_id?: string;
  tokens_used: number;
  cost: number;
  modelName?: string;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export class AdminService {
  /**
   * Get admin dashboard stats
   */
  static async getStats(): Promise<AdminStats> {
    await connectDB();

    const [
      totalUsers,
      totalConversations,
      totalMessages,
      usageStats,
      tierCounts,
      roleCounts,
    ] = await Promise.all([
      User.countDocuments(),
      Conversation.countDocuments(),
      Message.countDocuments(),
      UsageLog.aggregate([
        {
          $group: {
            _id: null,
            totalTokens: { $sum: '$tokens_used' },
            totalCost: { $sum: '$cost' },
          },
        },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$subscription_tier',
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Get total credits distributed (sum of all user credits)
    const creditsAgg = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$credits_remaining' },
        },
      },
    ]);

    const usage = usageStats[0] || { totalTokens: 0, totalCost: 0 };
    const credits = creditsAgg[0]?.total || 0;

    // Convert tier counts to object
    const usersByTier = { free: 0, basic: 0, pro: 0 };
    tierCounts.forEach((t: { _id: string; count: number }) => {
      if (t._id in usersByTier) {
        usersByTier[t._id as keyof typeof usersByTier] = t.count;
      }
    });

    // Convert role counts to object
    const usersByRole = { user: 0, admin: 0 };
    roleCounts.forEach((r: { _id: string; count: number }) => {
      if (r._id in usersByRole) {
        usersByRole[r._id as keyof typeof usersByRole] = r.count;
      }
    });

    return {
      totalUsers,
      totalConversations,
      totalMessages,
      totalCreditsDistributed: credits,
      totalTokensUsed: usage.totalTokens,
      totalCost: usage.totalCost,
      usersByTier,
      usersByRole,
    };
  }

  /**
   * List all users (paginated with filters)
   */
  static async listUsers(
    pagination: PaginationInput,
    filters: AdminUserFilters
  ): Promise<PaginatedResult<AdminUserItem>> {
    await connectDB();

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.tier) {
      query.subscription_tier = filters.tier;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      data: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        image: u.image,
        credits_remaining: u.credits_remaining,
        subscription_tier: u.subscription_tier,
        role: u.role,
        is_banned: u.is_banned,
        subscription_status: u.subscription_status,
        createdAt: u.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a user (admin action)
   */
  static async updateUser(
    userId: string,
    data: AdminUpdateUserInput
  ): Promise<AdminUserItem | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    const updateData: Record<string, unknown> = {};
    if (data.credits_remaining !== undefined) updateData.credits_remaining = data.credits_remaining;
    if (data.subscription_tier !== undefined) updateData.subscription_tier = data.subscription_tier;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.is_banned !== undefined) updateData.is_banned = data.is_banned;

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
      subscription_status: user.subscription_status,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get usage logs (paginated with filters)
   */
  static async getUsageLogs(
    pagination: PaginationInput,
    filters: UsageLogFilters
  ): Promise<PaginatedResult<UsageLogItem>> {
    await connectDB();

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};

    if (filters.userId) {
      if (!mongoose.Types.ObjectId.isValid(filters.userId)) {
        return { data: [], total: 0, page, totalPages: 0 };
      }
      query.user_id = new mongoose.Types.ObjectId(filters.userId);
    }

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        (query.createdAt as Record<string, Date>).$gte = new Date(filters.from);
      }
      if (filters.to) {
        (query.createdAt as Record<string, Date>).$lte = new Date(filters.to);
      }
    }

    const [logs, total] = await Promise.all([
      UsageLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UsageLog.countDocuments(query),
    ]);

    return {
      data: logs.map((l) => ({
        id: l._id.toString(),
        user_id: l.user_id.toString(),
        conversation_id: l.conversation_id?.toString(),
        message_id: l.message_id?.toString(),
        agent_id: l.agent_id,
        tokens_used: l.tokens_used,
        cost: l.cost,
        modelName: l.modelName,
        createdAt: l.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single user by ID (for admin viewing)
   */
  static async getUserById(userId: string): Promise<AdminUserItem | null> {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

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
      subscription_status: user.subscription_status,
      createdAt: user.createdAt,
    };
  }
}
