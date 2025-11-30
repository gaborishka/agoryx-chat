import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  credits_remaining: number;
  subscription_tier: 'free' | 'basic' | 'pro';
  role: 'user' | 'admin';
  is_banned: boolean;
}

export interface AuthResult {
  user: AuthenticatedUser;
}

export interface AuthError {
  error: string;
  status: number;
}

/**
 * Require authentication for an API route.
 * Returns the authenticated user or an error response.
 *
 * Usage:
 * ```typescript
 * export async function GET() {
 *   const auth = await requireAuth();
 *   if ('error' in auth) {
 *     return NextResponse.json({ error: auth.error }, { status: auth.status });
 *   }
 *   const { user } = auth;
 *   // ... use user.id, user.credits_remaining, etc.
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (session.user.is_banned) {
    return { error: 'Your account has been suspended', status: 403 };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name,
      image: session.user.image,
      credits_remaining: session.user.credits_remaining,
      subscription_tier: session.user.subscription_tier,
      role: session.user.role,
      is_banned: session.user.is_banned,
    },
  };
}

/**
 * Require admin role for an API route.
 * Returns the authenticated admin user or an error response.
 *
 * Usage:
 * ```typescript
 * export async function GET() {
 *   const auth = await requireAdmin();
 *   if ('error' in auth) {
 *     return NextResponse.json({ error: auth.error }, { status: auth.status });
 *   }
 *   const { user } = auth;
 *   // ... admin-only operations
 * }
 * ```
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const auth = await requireAuth();

  if ('error' in auth) {
    return auth;
  }

  if (auth.user.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return auth;
}

/**
 * Helper to check if the result is an error
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return 'error' in result;
}

/**
 * Helper to return an error response
 */
export function authErrorResponse(error: AuthError): NextResponse {
  return NextResponse.json({ error: error.error }, { status: error.status });
}
