
import { Agent, Conversation, User, PricingTier, SubscriptionTier, ConversationAgentConfig } from './types';

export const PRICING_TIERS: Record<SubscriptionTier, PricingTier> = {
  free: {
    id: 'free',
    name: 'Freemium',
    price: '$0',
    monthlyPriceVal: 0,
    annualPriceVal: 0,
    stripePriceId: 'price_free',
    credits: 100,
    features: ['Access to Flash', 'Limited Sage access', 'Standard support'],
    color: 'slate'
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: '$9.99',
    monthlyPriceVal: 9.99,
    annualPriceVal: 99.99,
    stripePriceId: 'price_basic_monthly',
    credits: 1000,
    features: ['Access to Flash & Sage', 'Priority processing', 'Email support', '2x Context Window'],
    color: 'blue',
    badge: 'Most Popular'
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$29.99',
    monthlyPriceVal: 29.99,
    annualPriceVal: 299.99,
    stripePriceId: 'price_pro_monthly',
    credits: 5000,
    features: ['Unlimited Flash', 'High Sage limits', 'Early access features', '24/7 Support', 'Max Context'],
    color: 'amber'
  }
};

export const MOCK_USER: User = {
  id: 'u1',
  full_name: 'Admin User',
  email: 'admin@agoryx.ai',
  credits_remaining: 9999,
  subscription_tier: 'pro',
  role: 'admin',
  joined_at: '2024-01-01',
  subscription_status: 'active',
  stripe_customer_id: 'cus_ADMIN123',
  cancel_at_period_end: false,
  current_period_end: 'April 1, 2025'
};

export const MOCK_USERS_DB: User[] = [
  MOCK_USER,
  {
    id: 'u2',
    full_name: 'Alice Chen',
    email: 'alice@example.com',
    credits_remaining: 450,
    subscription_tier: 'basic',
    role: 'user',
    joined_at: '2024-02-15',
    subscription_status: 'active',
    current_period_end: 'March 15, 2024'
  },
  {
    id: 'u3',
    full_name: 'Bob Miller',
    email: 'bob@example.com',
    credits_remaining: 10,
    subscription_tier: 'free',
    role: 'user',
    joined_at: '2024-03-01',
    subscription_status: 'active'
  },
  {
    id: 'u4',
    full_name: 'Charlie Davis',
    email: 'charlie@example.com',
    credits_remaining: 0,
    subscription_tier: 'pro',
    role: 'user',
    joined_at: '2023-12-20',
    subscription_status: 'past_due',
    is_banned: false
  },
  {
    id: 'u5',
    full_name: 'David Wilson',
    email: 'david.w@example.com',
    credits_remaining: 1200,
    subscription_tier: 'free',
    role: 'user',
    joined_at: '2024-01-10',
    subscription_status: 'canceled',
    is_banned: true
  }
];

export const DEFAULT_AGENTS: Record<string, Agent> = {
  flash: {
    id: 'flash',
    name: 'Flash',
    model: 'gemini-2.5-flash',
    avatar_url: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Flash&backgroundColor=b6e3f4',
    description: 'Fast, intuitive, efficient. Best for quick answers.',
    ui_color: 'blue',
    systemInstruction: 'You are Flash (System 1). Analyze the input quickly and efficiently. Be intuitive and concise.',
    isSystem: true
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    model: 'gemini-3-pro-preview',
    avatar_url: 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=Sage&backgroundColor=ffedd5',
    description: 'Analytical, critical, thorough. Best for complex reasoning.',
    ui_color: 'amber',
    systemInstruction: 'You are Sage (System 2). Analyze the input deeply and critically. Be thorough, use markdown, and think step-by-step.',
    isSystem: true
  },
  // Council Experts
  lawyer: {
    id: 'lawyer',
    name: 'Legal Expert',
    model: 'gemini-3-pro-preview',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Lawyer&clothing=blazerAndShirt',
    description: 'Legal analysis and risk assessment.',
    ui_color: 'purple',
    systemInstruction: 'You are a top-tier Lawyer. Analyze the user query from a legal perspective. Identify risks, compliance issues, and contractual implications. Be professional, cautious, and precise.',
    isSystem: true
  },
  economist: {
    id: 'economist',
    name: 'Economist',
    model: 'gemini-3-pro-preview',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Economist&glasses=round',
    description: 'Financial and market analysis.',
    ui_color: 'green',
    systemInstruction: 'You are a senior Economist. Analyze the user query from a financial and market perspective. Focus on incentives, costs, benefits, and market trends. Use data-driven reasoning.',
    isSystem: true
  },
  strategist: {
    id: 'strategist',
    name: 'Strategist',
    model: 'gemini-3-pro-preview',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Strategist',
    description: 'Long-term planning and competitive edge.',
    ui_color: 'teal',
    systemInstruction: 'You are a Business Strategist. Analyze the user query for long-term viability, competitive advantage, and strategic alignment. Think big picture and actionable steps.',
    isSystem: true
  },
  tech: {
    id: 'tech',
    name: 'Tech Lead',
    model: 'gemini-2.5-flash',
    avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Tech&top=hoodie',
    description: 'Technical feasibility and innovation.',
    ui_color: 'pink',
    systemInstruction: 'You are a CTO/Tech Lead. Analyze the user query from a technology implementation perspective. Focus on feasibility, stack choices, scalability, and technical debt.',
    isSystem: true
  },
  // Debate Agents
  debater_pro: {
    id: 'debater_pro',
    name: 'Proponent',
    model: 'gemini-2.5-flash',
    avatar_url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Pro&backgroundColor=d1fae5',
    description: 'Argues in favor of the motion.',
    ui_color: 'emerald',
    systemInstruction: 'You are a skilled debater arguing IN FAVOR of the motion. Your goal is to persuade the audience that the motion is correct using logic, evidence, and rhetorical skill. Be passionate but respectful.',
    isSystem: true
  },
  debater_con: {
    id: 'debater_con',
    name: 'Opponent',
    model: 'gemini-2.5-flash',
    avatar_url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Con&backgroundColor=ffe4e6',
    description: 'Argues against the motion.',
    ui_color: 'rose',
    systemInstruction: 'You are a skilled debater arguing AGAINST the motion. Your goal is to dismantle the Proponents arguments and persuade the audience the motion is incorrect. Be sharp and critical.',
    isSystem: true
  },
  moderator: {
    id: 'moderator',
    name: 'Moderator',
    model: 'gemini-3-pro-preview',
    avatar_url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Mod&backgroundColor=e2e8f0',
    description: 'Synthesizes and referees the debate.',
    ui_color: 'slate',
    systemInstruction: 'You are an impartial Debate Moderator. Your role is to summarize the arguments made by both sides, identify key areas of disagreement, and highlight logical strengths and weaknesses. Remain neutral.',
    isSystem: true
  }
};

export const DEFAULT_CONFIG: ConversationAgentConfig = {
  system1Id: 'flash',
  system2Id: 'sage',
  proponentId: 'debater_pro',
  opponentId: 'debater_con',
  moderatorId: 'moderator',
  councilIds: ['lawyer', 'economist']
};

const MOCK_CONVO_1: Conversation = {
  id: 'c1',
  user_id: MOCK_USER.id,
  title: 'SQL Optimization',
  preview: 'How do I optimize this query...',
  updated_at: '10:42 AM',
  mode: 'collaborative',
  agentConfig: { ...DEFAULT_CONFIG },
  messages: [
    {
      id: 'm1',
      conversation_id: 'c1',
      sender_type: 'user',
      sender_id: MOCK_USER.id,
      content: 'I have a SQL query taking 5 seconds to run on a 1M row table. It joins 3 tables on unindexed text columns. How can I fix it?',
      created_at: '10:40 AM'
    },
    {
      id: 'm2',
      conversation_id: 'c1',
      sender_type: 'agent',
      sender_id: 'flash',
      content: 'The most immediate fix is to add indexes to the columns used in your JOIN conditions. Joining on unindexed text columns is very slow because it requires full table scans. \n\n```sql\nCREATE INDEX idx_table1_col ON table1(col);\nCREATE INDEX idx_table2_col ON table2(col);\n```',
      created_at: '10:40 AM',
      metadata: {
        relatedToMessageId: 'm1'
      }
    },
    {
      id: 'm3',
      conversation_id: 'c1',
      sender_type: 'agent',
      sender_id: 'sage',
      content: 'While Flash is correct about indexing, we need to look deeper. \n\n1. **Data Type**: Why are you joining on text columns? If these are foreign keys, they should ideally be Integers or UUIDs. Text comparisons are computationally expensive.\n2. **Cardinality**: If the text columns have low cardinality (few unique values), a standard B-Tree index might not help as much as expected.\n\nI recommend refactoring the schema to use numeric IDs for relationships if possible.',
      created_at: '10:41 AM',
      metadata: {
        relatedToMessageId: 'm2'
      }
    }
  ]
};

const MOCK_CONVO_2: Conversation = {
  id: 'c2',
  user_id: MOCK_USER.id,
  title: 'Marketing Copy Review',
  preview: 'Draft a tweet for our launch...',
  updated_at: 'Yesterday',
  mode: 'collaborative',
  agentConfig: { ...DEFAULT_CONFIG },
  messages: [
    {
      id: 'm2-1',
      conversation_id: 'c2',
      sender_type: 'user',
      sender_id: MOCK_USER.id,
      content: 'Draft a tweet for our new coffee machine launch. It uses AI to predict exactly when you need caffeine.',
      created_at: 'Yesterday'
    },
    {
      id: 'm2-2',
      conversation_id: 'c2',
      sender_type: 'agent',
      sender_id: 'flash',
      content: '🚀 Never run on empty again! Introducing the SmartBrew 3000 - the first coffee maker that knows you need a cup before you do. ☕️✨ #CoffeeLover #AI #TechLaunch',
      created_at: 'Yesterday',
      metadata: {
        relatedToMessageId: 'm2-1'
      }
    },
    {
      id: 'm2-3',
      conversation_id: 'c2',
      sender_type: 'agent',
      sender_id: 'sage',
      content: 'Critique: The draft is energetic but generic. \n\nAnalysis:\n- "SmartBrew 3000" sounds dated.\n- It focuses on the machine, not the user benefit (productivity/energy).\n- Privacy concern: "Knows when you need a cup" might sound creepy to some users.\n\nSuggestion: Focus on the *outcome*—perfect timing. "The only barista that knows your rhythm."',
      created_at: 'Yesterday',
      metadata: {
        relatedToMessageId: 'm2-2'
      }
    }
  ]
};

export const MOCK_CONVERSATIONS = [MOCK_CONVO_1, MOCK_CONVO_2];