import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import clientPromise from './db/mongodb-client';
import connectDB from './db/mongoose';
import User from './db/models/User';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as NextAuthOptions['adapter'],
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('No user found with this email');
        }

        if (!user.password) {
          throw new Error('Please sign in with Google or set a password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        if (user.is_banned) {
          throw new Error('Your account has been suspended');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          credits_remaining: user.credits_remaining,
          subscription_tier: user.subscription_tier,
          role: user.role,
          is_banned: user.is_banned,
        };
      },
    }),
    // Google OAuth can be added later:
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.credits_remaining = user.credits_remaining;
        token.subscription_tier = user.subscription_tier;
        token.role = user.role;
        token.is_banned = user.is_banned;
      }

      // Handle session update (e.g., after credit deduction)
      if (trigger === 'update' && session) {
        if (session.credits_remaining !== undefined) {
          token.credits_remaining = session.credits_remaining;
        }
        if (session.subscription_tier !== undefined) {
          token.subscription_tier = session.subscription_tier;
        }
        if (session.role !== undefined) {
          token.role = session.role;
        }
        if (session.is_banned !== undefined) {
          token.is_banned = session.is_banned;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.credits_remaining = token.credits_remaining;
        session.user.subscription_tier = token.subscription_tier;
        session.user.role = token.role;
        session.user.is_banned = token.is_banned;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};
