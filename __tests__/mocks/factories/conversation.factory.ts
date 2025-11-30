import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import type { ChatMode, ConversationAgentConfig } from '@/types';

export interface TestConversation {
  _id?: Types.ObjectId;
  user_id: Types.ObjectId;
  title: string;
  preview: string;
  mode: ChatMode;
  agentConfig: ConversationAgentConfig;
  enableAutoReply: boolean;
  settings: {
    extendedDebate: boolean;
    autoScroll: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export function createTestConversation(
  overrides: Partial<TestConversation> & { user_id?: Types.ObjectId | string } = {}
): TestConversation {
  const userId =
    overrides.user_id instanceof Types.ObjectId
      ? overrides.user_id
      : overrides.user_id
        ? new Types.ObjectId(overrides.user_id)
        : new Types.ObjectId();

  return {
    _id: new Types.ObjectId(),
    user_id: userId,
    title: faker.lorem.sentence(3),
    preview: faker.lorem.sentence(5).slice(0, 100),
    mode: 'collaborative',
    agentConfig: {
      system1Id: 'flash',
      system2Id: 'sage',
    },
    enableAutoReply: false,
    settings: {
      extendedDebate: false,
      autoScroll: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createDebateConversation(
  overrides: Partial<TestConversation> = {}
): TestConversation {
  return createTestConversation({
    mode: 'debate',
    agentConfig: {
      system1Id: 'flash',
      system2Id: 'sage',
      proponentId: 'proponent',
      opponentId: 'opponent',
      moderatorId: 'moderator',
    },
    settings: {
      extendedDebate: true,
      autoScroll: true,
    },
    ...overrides,
  });
}

export function createExpertCouncilConversation(
  overrides: Partial<TestConversation> = {}
): TestConversation {
  return createTestConversation({
    mode: 'expert-council',
    agentConfig: {
      system1Id: 'flash',
      system2Id: 'sage',
      councilIds: ['lawyer', 'economist', 'scientist'],
    },
    ...overrides,
  });
}

export function createParallelConversation(
  overrides: Partial<TestConversation> = {}
): TestConversation {
  return createTestConversation({
    mode: 'parallel',
    ...overrides,
  });
}
