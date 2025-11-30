
export type SenderType = 'user' | 'agent';

export type SubscriptionTier = 'free' | 'basic' | 'pro';

export type UserRole = 'user' | 'admin';

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  monthlyPriceVal: number;
  annualPriceVal: number;
  stripePriceId: string;
  credits: number;
  features: string[];
  color: string;
  badge?: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  credits_remaining: number;
  avatar_url?: string;
  subscription_tier: SubscriptionTier;
  role: UserRole;
  joined_at: string;
  is_banned?: boolean;
  // Stripe Fields
  stripe_customer_id?: string;
  subscription_status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export interface AgentConfig {
  system1Id: string;
  system2Id: string;
}

export type UiColor = 'blue' | 'amber' | 'purple' | 'green' | 'teal' | 'pink' | 'rose' | 'emerald' | 'slate' | 'indigo' | 'orange' | 'cyan';

export interface Agent {
  id: string;
  name: string;
  model: string; // Standardized from model_type
  avatar_url: string;
  description: string;
  ui_color: UiColor; 
  systemInstruction?: string;
  isCustom?: boolean;
  isSystem?: boolean; // true for the hardcoded ones we don't want users to delete
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url?: string; // Data URL for preview/display (Images)
  mimeType: string;
  name: string;
  data?: string; // Base64 data (without prefix) for API (Images/PDF)
  textContent?: string; // Raw text content for code/text files
}

export interface MessageMetadata {
  relatedToMessageId?: string;
  isThinking?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id: string;
  content: string;
  created_at: string;
  metadata?: MessageMetadata;
  attachments?: Attachment[];
  cost?: number;
  feedback?: 'up' | 'down';
  isPinned?: boolean;
}

export interface ConversationAgentConfig {
  system1Id: string;
  system2Id: string;
  proponentId?: string; // For Debate Mode
  opponentId?: string;  // For Debate Mode
  moderatorId?: string; // For Debate Mode
  councilIds?: string[]; // For Expert Council
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  preview: string;
  updated_at: string;
  messages: Message[];
  settings?: {
    extendedDebate: boolean;
    autoScroll: boolean;
  };
  mode?: ChatMode; // Track which mode this conversation is in
  agentConfig: ConversationAgentConfig; // Per-conversation role assignment
  enableAutoReply?: boolean; // Feature: Allow agents to reply to each other
}

export type ChatMode = 'collaborative' | 'parallel' | 'expert-council' | 'debate';

export interface ChatSettings {
  extendedDebate: boolean;
  autoScroll: boolean;
  chatMode: ChatMode;
  defaultAgentConfig: ConversationAgentConfig;
}

export type ThemeMode = 'light' | 'dark';
