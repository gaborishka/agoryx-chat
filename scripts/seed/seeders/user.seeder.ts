import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User, { IUser } from '@/lib/db/models/User';
import { BaseSeeder } from './base.seeder';
import { getSeedUsers, UserSeedData, SYSTEM_USER_EMAIL } from '../data/users.data';

/**
 * User seeder - seeds default and demo users
 */
export class UserSeeder extends BaseSeeder<UserSeedData, IUser> {
  private userIdMap: Map<string, mongoose.Types.ObjectId> = new Map();

  constructor() {
    super('Users', 'user');
  }

  getData(): UserSeedData[] {
    return getSeedUsers();
  }

  async seed(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const userData of this.getData()) {
      const existing = await User.findOne({ email: userData.email });

      if (existing) {
        this.userIdMap.set(userData.email, existing._id);
        this.logSkip(userData.email);
        skipped++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        subscription_tier: userData.subscription_tier,
        credits_remaining: userData.credits_remaining,
        subscription_status: userData.subscription_status,
        is_banned: userData.is_banned || false,
      });

      this.userIdMap.set(userData.email, user._id);
      this.logCreate(userData.email);
      created++;
    }

    this.logSummary(created, skipped);
    return { created, skipped };
  }

  async clear(): Promise<number> {
    const emails = this.getData().map((u) => u.email);
    const result = await User.deleteMany({ email: { $in: emails } });
    return result.deletedCount;
  }

  /**
   * Get user ID by email (after seeding)
   */
  getUserId(email: string): mongoose.Types.ObjectId | undefined {
    return this.userIdMap.get(email);
  }

  /**
   * Get the system user ID (for agent ownership)
   */
  getSystemUserId(): mongoose.Types.ObjectId | undefined {
    return this.userIdMap.get(SYSTEM_USER_EMAIL);
  }

  /**
   * Lookup a user ID by email, fetching from DB if not in cache
   */
  async lookupUserId(email: string): Promise<mongoose.Types.ObjectId | null> {
    // Check cache first
    const cached = this.userIdMap.get(email);
    if (cached) return cached;

    // Fetch from database
    const user = await User.findOne({ email });
    if (user) {
      this.userIdMap.set(email, user._id);
      return user._id;
    }

    return null;
  }
}
