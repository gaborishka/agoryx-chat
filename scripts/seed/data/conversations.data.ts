/**
 * Demo conversation and message data for seeding
 */

import type { IConversationAgentConfig } from '@/lib/db/models/Conversation';

export interface ConversationSeedData {
  seedId: string;
  userEmail: string;
  title: string;
  preview: string;
  mode: 'collaborative' | 'parallel' | 'expert-council' | 'debate';
  agentConfig: IConversationAgentConfig;
  enableAutoReply: boolean;
}

export interface MessageSeedData {
  seedId: string;
  conversationSeedId: string;
  sender_type: 'user' | 'agent';
  sender_id: string; // email for user, agent_id for agent
  content: string;
  relatedToSeedId?: string;
}

/**
 * Demo conversations - minimal set for testing
 */
export const DEMO_CONVERSATIONS: ConversationSeedData[] = [
  {
    seedId: 'conv01',
    userEmail: 'admin@agoryx.com',
    title: 'SQL Optimization Discussion',
    preview: 'How do I optimize this query...',
    mode: 'collaborative',
    agentConfig: {
      system1Id: 'flash',
      system2Id: 'sage',
    },
    enableAutoReply: false,
  },
  {
    seedId: 'conv02',
    userEmail: 'alice@example.com',
    title: 'Marketing Strategy Review',
    preview: 'Draft a tweet for our launch...',
    mode: 'collaborative',
    agentConfig: {
      system1Id: 'flash',
      system2Id: 'sage',
    },
    enableAutoReply: false,
  },
];

/**
 * Demo messages for the conversations
 */
export const DEMO_MESSAGES: MessageSeedData[] = [
  // Conversation 1: SQL Optimization (Admin)
  {
    seedId: 'msg01',
    conversationSeedId: 'conv01',
    sender_type: 'user',
    sender_id: 'admin@agoryx.com',
    content:
      'I have a SQL query taking 5 seconds to run on a 1M row table. It joins 3 tables on unindexed text columns. How can I fix it?',
  },
  {
    seedId: 'msg02',
    conversationSeedId: 'conv01',
    sender_type: 'agent',
    sender_id: 'flash',
    content: `The most immediate fix is to add indexes to the columns used in your JOIN conditions. Joining on unindexed text columns is very slow because it requires full table scans.

\`\`\`sql
CREATE INDEX idx_table1_col ON table1(col);
CREATE INDEX idx_table2_col ON table2(col);
\`\`\``,
    relatedToSeedId: 'msg01',
  },
  {
    seedId: 'msg03',
    conversationSeedId: 'conv01',
    sender_type: 'agent',
    sender_id: 'sage',
    content: `While Flash is correct about indexing, we need to look deeper.

1. **Data Type**: Why are you joining on text columns? If these are foreign keys, they should ideally be Integers or UUIDs. Text comparisons are computationally expensive.
2. **Cardinality**: If the text columns have low cardinality (few unique values), a standard B-Tree index might not help as much as expected.

I recommend refactoring the schema to use numeric IDs for relationships if possible.`,
    relatedToSeedId: 'msg02',
  },

  // Conversation 2: Marketing Strategy (Alice)
  {
    seedId: 'msg04',
    conversationSeedId: 'conv02',
    sender_type: 'user',
    sender_id: 'alice@example.com',
    content:
      'Draft a tweet for our new coffee machine launch. It uses AI to predict exactly when you need caffeine.',
  },
  {
    seedId: 'msg05',
    conversationSeedId: 'conv02',
    sender_type: 'agent',
    sender_id: 'flash',
    content:
      'Never run on empty again! Introducing the SmartBrew 3000 - the first coffee maker that knows you need a cup before you do. #CoffeeLover #AI #TechLaunch',
    relatedToSeedId: 'msg04',
  },
  {
    seedId: 'msg06',
    conversationSeedId: 'conv02',
    sender_type: 'agent',
    sender_id: 'sage',
    content: `Critique: The draft is energetic but generic.

**Analysis:**
- "SmartBrew 3000" sounds dated.
- It focuses on the machine, not the user benefit (productivity/energy).
- Privacy concern: "Knows when you need a cup" might sound creepy to some users.

**Suggestion:** Focus on the *outcome*—perfect timing. "The only barista that knows your rhythm."`,
    relatedToSeedId: 'msg05',
  },
];
