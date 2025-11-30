
import { User } from '../types';
import { MOCK_USERS_DB, PRICING_TIERS } from '../constants';

export interface AdminStats {
    totalUsers: number;
    activeSubs: number;
    totalRevenue: number;
    apiHealth: 'healthy' | 'degraded' | 'down';
    errorRate: number;
}

export interface SystemLog {
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    source: string;
}

// Simulating an in-memory database for the session
let dbUsers = [...MOCK_USERS_DB];

export const AdminService = {
    async getStats(): Promise<AdminStats> {
        await new Promise(r => setTimeout(r, 600));
        
        const totalUsers = dbUsers.length;
        const activeSubs = dbUsers.filter(u => u.subscription_status === 'active' && u.subscription_tier !== 'free').length;
        
        // Calculate mock MRR
        const totalRevenue = dbUsers.reduce((acc, user) => {
            return acc + (PRICING_TIERS[user.subscription_tier].monthlyPriceVal || 0);
        }, 0);

        return {
            totalUsers,
            activeSubs,
            totalRevenue,
            apiHealth: 'healthy',
            errorRate: 0.02
        };
    },

    async getAllUsers(): Promise<User[]> {
        await new Promise(r => setTimeout(r, 800));
        return [...dbUsers];
    },

    async updateUserCredits(userId: string, amount: number): Promise<User> {
        await new Promise(r => setTimeout(r, 500));
        const userIndex = dbUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error("User not found");
        
        const updatedUser = { ...dbUsers[userIndex], credits_remaining: amount };
        dbUsers[userIndex] = updatedUser;
        return updatedUser;
    },

    async toggleUserBan(userId: string): Promise<User> {
        await new Promise(r => setTimeout(r, 500));
        const userIndex = dbUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error("User not found");

        const currentBanStatus = !!dbUsers[userIndex].is_banned;
        const updatedUser = { ...dbUsers[userIndex], is_banned: !currentBanStatus };
        dbUsers[userIndex] = updatedUser;
        return updatedUser;
    },

    async getSystemLogs(): Promise<SystemLog[]> {
        await new Promise(r => setTimeout(r, 400));
        return [
            { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Backup completed successfully', source: 'System' },
            { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), level: 'warning', message: 'High latency detected in US-East', source: 'API Gateway' },
            { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), level: 'error', message: 'Payment webhook signature verification failed', source: 'Stripe Webhook' },
            { id: '4', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), level: 'info', message: 'New user registration (u5)', source: 'Auth Service' },
            { id: '5', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), level: 'info', message: 'Daily analytics aggregation job finished', source: 'Analytics Worker' },
        ];
    }
};
