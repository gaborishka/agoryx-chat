import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      credits_remaining: number;
      subscription_tier: 'free' | 'basic' | 'pro';
      role: 'user' | 'admin';
      is_banned: boolean;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    credits_remaining: number;
    subscription_tier: 'free' | 'basic' | 'pro';
    role: 'user' | 'admin';
    is_banned: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    credits_remaining: number;
    subscription_tier: 'free' | 'basic' | 'pro';
    role: 'user' | 'admin';
    is_banned: boolean;
  }
}
