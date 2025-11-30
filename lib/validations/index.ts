import { z } from 'zod';

// ============================================
// Shared Enums & Primitives
// ============================================

export const uiColorSchema = z.enum([
  'blue', 'amber', 'purple', 'green', 'teal',
  'pink', 'rose', 'emerald', 'slate', 'indigo',
  'orange', 'cyan'
]);

export const chatModeSchema = z.enum([
  'collaborative', 'parallel', 'expert-council', 'debate'
]);

export const subscriptionTierSchema = z.enum(['free', 'basic', 'pro']);

export const userRoleSchema = z.enum(['user', 'admin']);

export const feedbackSchema = z.enum(['up', 'down']);

// ============================================
// Pagination
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ============================================
// User Schemas
// ============================================

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================
// Conversation Schemas
// ============================================

export const agentConfigSchema = z.object({
  system1Id: z.string().min(1),
  system2Id: z.string().min(1),
  proponentId: z.string().optional(),
  opponentId: z.string().optional(),
  moderatorId: z.string().optional(),
  councilIds: z.array(z.string()).optional(),
});

export const conversationSettingsSchema = z.object({
  extendedDebate: z.boolean().optional(),
  autoScroll: z.boolean().optional(),
});

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  mode: chatModeSchema.optional(),
  agentConfig: agentConfigSchema.optional(),
  enableAutoReply: z.boolean().optional(),
  settings: conversationSettingsSchema.optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().max(200).optional(),
  mode: chatModeSchema.optional(),
  agentConfig: agentConfigSchema.optional(),
  enableAutoReply: z.boolean().optional(),
  settings: conversationSettingsSchema.optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

// ============================================
// Message Schemas
// ============================================

export const attachmentSchema = z.object({
  type: z.enum(['image', 'file']),
  mimeType: z.string().min(1),
  name: z.string().min(1),
  url: z.string().optional(),
  data: z.string().optional(),
  textContent: z.string().optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1),
  attachments: z.array(attachmentSchema).optional(),
});

export const updateMessageSchema = z.object({
  feedback: feedbackSchema.nullable().optional(),
  isPinned: z.boolean().optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

// ============================================
// Agent Schemas
// ============================================

export const createAgentSchema = z.object({
  agent_id: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, {
    message: 'Agent ID must be lowercase alphanumeric with underscores or hyphens',
  }),
  name: z.string().min(1).max(100),
  modelName: z.string().min(1),
  ui_color: uiColorSchema,
  description: z.string().max(500).optional(),
  systemInstruction: z.string().max(5000).optional(),
  avatar_url: z.string().url().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  modelName: z.string().min(1).optional(),
  ui_color: uiColorSchema.optional(),
  description: z.string().max(500).optional(),
  systemInstruction: z.string().max(5000).optional(),
  avatar_url: z.string().url().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

// ============================================
// Admin Schemas
// ============================================

export const adminUpdateUserSchema = z.object({
  credits_remaining: z.number().int().min(0).optional(),
  subscription_tier: subscriptionTierSchema.optional(),
  role: userRoleSchema.optional(),
  is_banned: z.boolean().optional(),
});

export const adminUserFiltersSchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  tier: subscriptionTierSchema.optional(),
});

export const usageLogFiltersSchema = z.object({
  userId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminUserFilters = z.infer<typeof adminUserFiltersSchema>;
export type UsageLogFilters = z.infer<typeof usageLogFiltersSchema>;

// ============================================
// Utility: Safe Parse Helper
// ============================================

export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}

export function parseQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): T {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}
