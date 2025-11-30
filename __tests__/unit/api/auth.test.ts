import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import {
  requireAuth,
  requireAdmin,
  isAuthError,
  authErrorResponse,
  type AuthResult,
  type AuthError,
} from '@/lib/api/auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

const mockGetServerSession = vi.mocked(getServerSession);

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 error when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await requireAuth();

    expect(result).toEqual({
      error: 'Unauthorized',
      status: 401,
    });
  });

  it('should return 401 error when session has no user', async () => {
    mockGetServerSession.mockResolvedValue({});

    const result = await requireAuth();

    expect(result).toEqual({
      error: 'Unauthorized',
      status: 401,
    });
  });

  it('should return 403 error when user is banned', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        credits_remaining: 100,
        subscription_tier: 'free',
        role: 'user',
        is_banned: true,
      },
    });

    const result = await requireAuth();

    expect(result).toEqual({
      error: 'Your account has been suspended',
      status: 403,
    });
  });

  it('should return user when authenticated and not banned', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.png',
      credits_remaining: 100,
      subscription_tier: 'free' as const,
      role: 'user' as const,
      is_banned: false,
    };

    mockGetServerSession.mockResolvedValue({
      user: mockUser,
    });

    const result = await requireAuth();

    expect('user' in result).toBe(true);
    expect((result as AuthResult).user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'https://example.com/avatar.png',
      credits_remaining: 100,
      subscription_tier: 'free',
      role: 'user',
      is_banned: false,
    });
  });

  it('should handle user with null optional fields', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-456',
        email: 'minimal@example.com',
        name: null,
        image: null,
        credits_remaining: 50,
        subscription_tier: 'basic',
        role: 'user',
        is_banned: false,
      },
    });

    const result = await requireAuth();

    expect('user' in result).toBe(true);
    expect((result as AuthResult).user.name).toBeNull();
    expect((result as AuthResult).user.image).toBeNull();
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should pass through 401 error when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result).toEqual({
      error: 'Unauthorized',
      status: 401,
    });
  });

  it('should pass through 403 error when user is banned', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        credits_remaining: 100,
        subscription_tier: 'free',
        role: 'user',
        is_banned: true,
      },
    });

    const result = await requireAdmin();

    expect(result).toEqual({
      error: 'Your account has been suspended',
      status: 403,
    });
  });

  it('should return 403 error when user is not admin', async () => {
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Regular User',
        image: null,
        credits_remaining: 100,
        subscription_tier: 'free',
        role: 'user',
        is_banned: false,
      },
    });

    const result = await requireAdmin();

    expect(result).toEqual({
      error: 'Admin access required',
      status: 403,
    });
  });

  it('should return user when authenticated as admin', async () => {
    const adminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin User',
      image: 'https://example.com/admin.png',
      credits_remaining: 10000,
      subscription_tier: 'pro' as const,
      role: 'admin' as const,
      is_banned: false,
    };

    mockGetServerSession.mockResolvedValue({
      user: adminUser,
    });

    const result = await requireAdmin();

    expect('user' in result).toBe(true);
    expect((result as AuthResult).user.role).toBe('admin');
    expect((result as AuthResult).user.id).toBe('admin-123');
  });
});

describe('isAuthError', () => {
  it('should return true for error objects', () => {
    const error: AuthError = { error: 'Unauthorized', status: 401 };
    expect(isAuthError(error)).toBe(true);
  });

  it('should return true for various error types', () => {
    expect(isAuthError({ error: 'Forbidden', status: 403 })).toBe(true);
    expect(isAuthError({ error: 'Not Found', status: 404 })).toBe(true);
  });

  it('should return false for auth result objects', () => {
    const result: AuthResult = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        image: null,
        credits_remaining: 100,
        subscription_tier: 'free',
        role: 'user',
        is_banned: false,
      },
    };
    expect(isAuthError(result)).toBe(false);
  });

  it('should correctly type guard in conditional', () => {
    const maybeError: AuthResult | AuthError = { error: 'Test', status: 500 };

    if (isAuthError(maybeError)) {
      // TypeScript should recognize this as AuthError
      expect(maybeError.error).toBe('Test');
      expect(maybeError.status).toBe(500);
    } else {
      // This branch should not be reached
      expect.fail('Should have detected as error');
    }
  });
});

describe('authErrorResponse', () => {
  it('should return NextResponse with 401 status', () => {
    const error: AuthError = { error: 'Unauthorized', status: 401 };
    const response = authErrorResponse(error);

    expect(response.status).toBe(401);
  });

  it('should return NextResponse with 403 status', () => {
    const error: AuthError = { error: 'Forbidden', status: 403 };
    const response = authErrorResponse(error);

    expect(response.status).toBe(403);
  });

  it('should include error message in JSON body', async () => {
    const error: AuthError = { error: 'Custom error message', status: 400 };
    const response = authErrorResponse(error);

    const body = await response.json();
    expect(body).toEqual({ error: 'Custom error message' });
  });

  it('should return JSON content type', () => {
    const error: AuthError = { error: 'Test', status: 500 };
    const response = authErrorResponse(error);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
