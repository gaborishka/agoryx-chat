import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import type { SenderType, Attachment, MessageMetadata } from '@/types';

export interface TestMessage {
  _id?: Types.ObjectId;
  conversation_id: Types.ObjectId;
  sender_type: SenderType;
  sender_id: string;
  content: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
  cost?: number;
  feedback?: 'up' | 'down';
  isPinned?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createTestMessage(
  overrides: Partial<TestMessage> & { conversation_id?: Types.ObjectId | string } = {}
): TestMessage {
  const conversationId =
    overrides.conversation_id instanceof Types.ObjectId
      ? overrides.conversation_id
      : overrides.conversation_id
        ? new Types.ObjectId(overrides.conversation_id)
        : new Types.ObjectId();

  return {
    _id: new Types.ObjectId(),
    conversation_id: conversationId,
    sender_type: 'user',
    sender_id: new Types.ObjectId().toString(),
    content: faker.lorem.paragraph(),
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createAgentMessage(
  overrides: Partial<TestMessage> = {}
): TestMessage {
  return createTestMessage({
    sender_type: 'agent',
    sender_id: 'flash',
    cost: faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }),
    ...overrides,
  });
}

export function createMessageWithAttachments(
  attachments: Partial<Attachment>[],
  overrides: Partial<TestMessage> = {}
): TestMessage {
  const fullAttachments: Attachment[] = attachments.map((att, index) => ({
    id: `att-${index}`,
    type: 'image',
    mimeType: 'image/png',
    name: `image-${index}.png`,
    ...att,
  }));

  return createTestMessage({
    attachments: fullAttachments,
    ...overrides,
  });
}

export function createPinnedMessage(overrides: Partial<TestMessage> = {}): TestMessage {
  return createTestMessage({
    isPinned: true,
    ...overrides,
  });
}

export function createMessageWithFeedback(
  feedback: 'up' | 'down',
  overrides: Partial<TestMessage> = {}
): TestMessage {
  return createTestMessage({
    feedback,
    ...overrides,
  });
}

export function createMessageWithMetadata(
  metadata: MessageMetadata,
  overrides: Partial<TestMessage> = {}
): TestMessage {
  return createTestMessage({
    metadata,
    ...overrides,
  });
}
