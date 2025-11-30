import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  updateUserSchema,
  agentConfigSchema,
  createConversationSchema,
  updateConversationSchema,
  createMessageSchema,
  updateMessageSchema,
  attachmentSchema,
  createAgentSchema,
  updateAgentSchema,
  adminUpdateUserSchema,
  chatModeSchema,
  uiColorSchema,
  subscriptionTierSchema,
  userRoleSchema,
  feedbackSchema,
  parseOrThrow,
  parseQueryParams,
} from '@/lib/validations';

// ============================================
// Enum Schemas
// ============================================

describe('chatModeSchema', () => {
  it('should accept valid chat modes', () => {
    expect(chatModeSchema.parse('collaborative')).toBe('collaborative');
    expect(chatModeSchema.parse('parallel')).toBe('parallel');
    expect(chatModeSchema.parse('expert-council')).toBe('expert-council');
    expect(chatModeSchema.parse('debate')).toBe('debate');
  });

  it('should reject invalid chat modes', () => {
    expect(() => chatModeSchema.parse('invalid')).toThrow();
    expect(() => chatModeSchema.parse('')).toThrow();
    expect(() => chatModeSchema.parse(123)).toThrow();
  });
});

describe('uiColorSchema', () => {
  it('should accept valid UI colors', () => {
    const validColors = [
      'blue', 'amber', 'purple', 'green', 'teal',
      'pink', 'rose', 'emerald', 'slate', 'indigo',
      'orange', 'cyan',
    ];

    validColors.forEach((color) => {
      expect(uiColorSchema.parse(color)).toBe(color);
    });
  });

  it('should reject invalid colors', () => {
    expect(() => uiColorSchema.parse('red')).toThrow();
    expect(() => uiColorSchema.parse('black')).toThrow();
    expect(() => uiColorSchema.parse('')).toThrow();
  });
});

describe('subscriptionTierSchema', () => {
  it('should accept valid tiers', () => {
    expect(subscriptionTierSchema.parse('free')).toBe('free');
    expect(subscriptionTierSchema.parse('basic')).toBe('basic');
    expect(subscriptionTierSchema.parse('pro')).toBe('pro');
  });

  it('should reject invalid tiers', () => {
    expect(() => subscriptionTierSchema.parse('enterprise')).toThrow();
    expect(() => subscriptionTierSchema.parse('')).toThrow();
  });
});

describe('userRoleSchema', () => {
  it('should accept valid roles', () => {
    expect(userRoleSchema.parse('user')).toBe('user');
    expect(userRoleSchema.parse('admin')).toBe('admin');
  });

  it('should reject invalid roles', () => {
    expect(() => userRoleSchema.parse('superadmin')).toThrow();
    expect(() => userRoleSchema.parse('')).toThrow();
  });
});

describe('feedbackSchema', () => {
  it('should accept valid feedback values', () => {
    expect(feedbackSchema.parse('up')).toBe('up');
    expect(feedbackSchema.parse('down')).toBe('down');
  });

  it('should reject invalid feedback', () => {
    expect(() => feedbackSchema.parse('neutral')).toThrow();
    expect(() => feedbackSchema.parse('')).toThrow();
  });
});

// ============================================
// Pagination Schema
// ============================================

describe('paginationSchema', () => {
  it('should parse valid pagination params', () => {
    const result = paginationSchema.parse({ page: 1, limit: 20 });
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('should apply defaults when not provided', () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it('should coerce string values to numbers', () => {
    const result = paginationSchema.parse({ page: '2', limit: '50' });
    expect(result).toEqual({ page: 2, limit: 50 });
  });

  it('should enforce minimum page of 1', () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ page: -1 })).toThrow();
  });

  it('should enforce limit range (1-100)', () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
    expect(() => paginationSchema.parse({ limit: 101 })).toThrow();

    const maxResult = paginationSchema.parse({ limit: 100 });
    expect(maxResult.limit).toBe(100);
  });
});

// ============================================
// User Schemas
// ============================================

describe('updateUserSchema', () => {
  it('should accept valid user updates', () => {
    const result = updateUserSchema.parse({
      name: 'John Doe',
      email: 'john@example.com',
    });
    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('should accept partial updates', () => {
    expect(updateUserSchema.parse({ name: 'John' })).toEqual({ name: 'John' });
    expect(updateUserSchema.parse({ email: 'john@example.com' })).toEqual({
      email: 'john@example.com',
    });
  });

  it('should accept empty object', () => {
    expect(updateUserSchema.parse({})).toEqual({});
  });

  it('should reject invalid email format', () => {
    expect(() => updateUserSchema.parse({ email: 'invalid-email' })).toThrow();
    expect(() => updateUserSchema.parse({ email: '' })).toThrow();
  });

  it('should reject empty name', () => {
    expect(() => updateUserSchema.parse({ name: '' })).toThrow();
  });

  it('should enforce name max length', () => {
    const longName = 'a'.repeat(101);
    expect(() => updateUserSchema.parse({ name: longName })).toThrow();
  });
});

// ============================================
// Conversation Schemas
// ============================================

describe('agentConfigSchema', () => {
  it('should parse valid agent config', () => {
    const result = agentConfigSchema.parse({
      system1Id: 'flash',
      system2Id: 'sage',
    });
    expect(result).toEqual({
      system1Id: 'flash',
      system2Id: 'sage',
    });
  });

  it('should accept optional debate fields', () => {
    const result = agentConfigSchema.parse({
      system1Id: 'flash',
      system2Id: 'sage',
      proponentId: 'proponent',
      opponentId: 'opponent',
      moderatorId: 'moderator',
    });
    expect(result.proponentId).toBe('proponent');
    expect(result.opponentId).toBe('opponent');
    expect(result.moderatorId).toBe('moderator');
  });

  it('should accept council IDs array', () => {
    const result = agentConfigSchema.parse({
      system1Id: 'flash',
      system2Id: 'sage',
      councilIds: ['lawyer', 'economist'],
    });
    expect(result.councilIds).toEqual(['lawyer', 'economist']);
  });

  it('should require system1Id and system2Id', () => {
    expect(() => agentConfigSchema.parse({})).toThrow();
    expect(() => agentConfigSchema.parse({ system1Id: 'flash' })).toThrow();
  });

  it('should reject empty system IDs', () => {
    expect(() =>
      agentConfigSchema.parse({ system1Id: '', system2Id: 'sage' })
    ).toThrow();
  });
});

describe('createConversationSchema', () => {
  it('should accept empty object (all optional)', () => {
    const result = createConversationSchema.parse({});
    expect(result).toEqual({});
  });

  it('should parse full conversation creation', () => {
    const result = createConversationSchema.parse({
      title: 'Test Conversation',
      mode: 'collaborative',
      agentConfig: { system1Id: 'flash', system2Id: 'sage' },
      enableAutoReply: true,
      settings: { extendedDebate: false, autoScroll: true },
    });

    expect(result.title).toBe('Test Conversation');
    expect(result.mode).toBe('collaborative');
    expect(result.enableAutoReply).toBe(true);
  });

  it('should enforce title max length', () => {
    const longTitle = 'a'.repeat(201);
    expect(() => createConversationSchema.parse({ title: longTitle })).toThrow();
  });

  it('should reject invalid mode', () => {
    expect(() =>
      createConversationSchema.parse({ mode: 'invalid-mode' })
    ).toThrow();
  });
});

describe('updateConversationSchema', () => {
  it('should accept partial updates', () => {
    expect(updateConversationSchema.parse({ title: 'New Title' })).toEqual({
      title: 'New Title',
    });
    expect(updateConversationSchema.parse({ mode: 'debate' })).toEqual({
      mode: 'debate',
    });
  });
});

// ============================================
// Message Schemas
// ============================================

describe('attachmentSchema', () => {
  it('should parse valid image attachment', () => {
    const result = attachmentSchema.parse({
      type: 'image',
      mimeType: 'image/png',
      name: 'screenshot.png',
      url: 'data:image/png;base64,abc123',
    });
    expect(result.type).toBe('image');
    expect(result.mimeType).toBe('image/png');
  });

  it('should parse valid file attachment', () => {
    const result = attachmentSchema.parse({
      type: 'file',
      mimeType: 'application/pdf',
      name: 'document.pdf',
      data: 'base64data',
    });
    expect(result.type).toBe('file');
  });

  it('should accept text content for text files', () => {
    const result = attachmentSchema.parse({
      type: 'file',
      mimeType: 'text/plain',
      name: 'code.js',
      textContent: 'console.log("hello")',
    });
    expect(result.textContent).toBe('console.log("hello")');
  });

  it('should reject invalid type', () => {
    expect(() =>
      attachmentSchema.parse({
        type: 'video',
        mimeType: 'video/mp4',
        name: 'video.mp4',
      })
    ).toThrow();
  });

  it('should require mimeType and name', () => {
    expect(() => attachmentSchema.parse({ type: 'image' })).toThrow();
    expect(() =>
      attachmentSchema.parse({ type: 'image', mimeType: 'image/png' })
    ).toThrow();
  });
});

describe('createMessageSchema', () => {
  it('should parse valid message', () => {
    const result = createMessageSchema.parse({
      content: 'Hello, world!',
    });
    expect(result.content).toBe('Hello, world!');
  });

  it('should accept message with attachments', () => {
    const result = createMessageSchema.parse({
      content: 'Check this out',
      attachments: [
        { type: 'image', mimeType: 'image/png', name: 'image.png' },
      ],
    });
    expect(result.attachments).toHaveLength(1);
  });

  it('should require non-empty content', () => {
    expect(() => createMessageSchema.parse({ content: '' })).toThrow();
    expect(() => createMessageSchema.parse({})).toThrow();
  });
});

describe('updateMessageSchema', () => {
  it('should accept feedback update', () => {
    expect(updateMessageSchema.parse({ feedback: 'up' })).toEqual({
      feedback: 'up',
    });
    expect(updateMessageSchema.parse({ feedback: 'down' })).toEqual({
      feedback: 'down',
    });
  });

  it('should accept null feedback (remove)', () => {
    expect(updateMessageSchema.parse({ feedback: null })).toEqual({
      feedback: null,
    });
  });

  it('should accept isPinned update', () => {
    expect(updateMessageSchema.parse({ isPinned: true })).toEqual({
      isPinned: true,
    });
    expect(updateMessageSchema.parse({ isPinned: false })).toEqual({
      isPinned: false,
    });
  });
});

// ============================================
// Agent Schemas
// ============================================

describe('createAgentSchema', () => {
  it('should parse valid agent creation', () => {
    const result = createAgentSchema.parse({
      agent_id: 'my-agent',
      name: 'My Agent',
      modelName: 'gemini-2.0-flash',
      ui_color: 'blue',
    });
    expect(result.agent_id).toBe('my-agent');
    expect(result.name).toBe('My Agent');
  });

  it('should accept optional fields', () => {
    const result = createAgentSchema.parse({
      agent_id: 'my_agent_123',
      name: 'My Agent',
      modelName: 'gemini-2.0-flash',
      ui_color: 'purple',
      description: 'A helpful agent',
      systemInstruction: 'You are a helpful assistant',
      avatar_url: 'https://example.com/avatar.png',
    });
    expect(result.description).toBe('A helpful agent');
    expect(result.systemInstruction).toBe('You are a helpful assistant');
  });

  it('should enforce agent_id format (lowercase alphanumeric with _ or -)', () => {
    // Valid IDs
    expect(createAgentSchema.parse({
      agent_id: 'my-agent',
      name: 'Test',
      modelName: 'gemini',
      ui_color: 'blue',
    })).toBeDefined();

    expect(createAgentSchema.parse({
      agent_id: 'my_agent_123',
      name: 'Test',
      modelName: 'gemini',
      ui_color: 'blue',
    })).toBeDefined();

    // Invalid IDs
    expect(() =>
      createAgentSchema.parse({
        agent_id: 'My-Agent', // uppercase
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
      })
    ).toThrow();

    expect(() =>
      createAgentSchema.parse({
        agent_id: 'my agent', // space
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
      })
    ).toThrow();

    expect(() =>
      createAgentSchema.parse({
        agent_id: 'my.agent', // dot
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
      })
    ).toThrow();
  });

  it('should enforce max lengths', () => {
    // agent_id max 50
    expect(() =>
      createAgentSchema.parse({
        agent_id: 'a'.repeat(51),
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
      })
    ).toThrow();

    // name max 100
    expect(() =>
      createAgentSchema.parse({
        agent_id: 'test',
        name: 'a'.repeat(101),
        modelName: 'gemini',
        ui_color: 'blue',
      })
    ).toThrow();

    // description max 500
    expect(() =>
      createAgentSchema.parse({
        agent_id: 'test',
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
        description: 'a'.repeat(501),
      })
    ).toThrow();

    // systemInstruction max 5000
    expect(() =>
      createAgentSchema.parse({
        agent_id: 'test',
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
        systemInstruction: 'a'.repeat(5001),
      })
    ).toThrow();
  });

  it('should validate avatar_url as URL', () => {
    expect(() =>
      createAgentSchema.parse({
        agent_id: 'test',
        name: 'Test',
        modelName: 'gemini',
        ui_color: 'blue',
        avatar_url: 'not-a-url',
      })
    ).toThrow();
  });
});

describe('updateAgentSchema', () => {
  it('should accept partial updates', () => {
    expect(updateAgentSchema.parse({ name: 'New Name' })).toEqual({
      name: 'New Name',
    });
    expect(updateAgentSchema.parse({ ui_color: 'green' })).toEqual({
      ui_color: 'green',
    });
  });

  it('should accept empty object', () => {
    expect(updateAgentSchema.parse({})).toEqual({});
  });
});

// ============================================
// Admin Schemas
// ============================================

describe('adminUpdateUserSchema', () => {
  it('should accept valid admin updates', () => {
    const result = adminUpdateUserSchema.parse({
      credits_remaining: 500,
      subscription_tier: 'pro',
      role: 'admin',
      is_banned: false,
    });
    expect(result.credits_remaining).toBe(500);
    expect(result.subscription_tier).toBe('pro');
  });

  it('should enforce non-negative credits', () => {
    expect(() =>
      adminUpdateUserSchema.parse({ credits_remaining: -1 })
    ).toThrow();
  });

  it('should accept partial updates', () => {
    expect(adminUpdateUserSchema.parse({ is_banned: true })).toEqual({
      is_banned: true,
    });
  });
});

// ============================================
// Utility Functions
// ============================================

describe('parseOrThrow', () => {
  it('should return parsed data on success', () => {
    const result = parseOrThrow(paginationSchema, { page: 1, limit: 10 });
    expect(result).toEqual({ page: 1, limit: 10 });
  });

  it('should throw formatted error on failure', () => {
    expect(() => parseOrThrow(paginationSchema, { page: 0 })).toThrow(
      /Validation failed/
    );
  });

  it('should include field paths in error message', () => {
    try {
      parseOrThrow(createAgentSchema, { agent_id: '', name: '', modelName: '', ui_color: 'invalid' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as Error).message).toContain('Validation failed');
    }
  });
});

describe('parseQueryParams', () => {
  it('should parse URLSearchParams to object and validate', () => {
    const params = new URLSearchParams();
    params.set('page', '2');
    params.set('limit', '30');

    const result = parseQueryParams(paginationSchema, params);
    expect(result).toEqual({ page: 2, limit: 30 });
  });

  it('should apply defaults for missing params', () => {
    const params = new URLSearchParams();
    const result = parseQueryParams(paginationSchema, params);
    expect(result).toEqual({ page: 1, limit: 20 });
  });
});
