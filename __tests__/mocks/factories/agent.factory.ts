import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import type { UiColor } from '@/types';

export interface TestAgent {
  _id?: Types.ObjectId;
  agent_id: string;
  user_id?: Types.ObjectId;
  name: string;
  modelName: string;
  ui_color: UiColor;
  description?: string;
  systemInstruction?: string;
  avatar_url?: string;
  isCustom?: boolean;
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UI_COLORS: UiColor[] = [
  'blue', 'amber', 'purple', 'green', 'teal',
  'pink', 'rose', 'emerald', 'slate', 'indigo',
  'orange', 'cyan',
];

export function createTestAgent(
  overrides: Partial<TestAgent> & { user_id?: Types.ObjectId | string } = {}
): TestAgent {
  const userId =
    overrides.user_id instanceof Types.ObjectId
      ? overrides.user_id
      : overrides.user_id
        ? new Types.ObjectId(overrides.user_id)
        : undefined;

  const agentId = overrides.agent_id || faker.helpers.slugify(faker.word.noun()).toLowerCase();

  return {
    _id: new Types.ObjectId(),
    agent_id: agentId,
    user_id: userId,
    name: faker.person.firstName(),
    modelName: 'gemini-2.0-flash',
    ui_color: faker.helpers.arrayElement(UI_COLORS),
    description: faker.lorem.sentence(),
    systemInstruction: faker.lorem.paragraph(),
    isCustom: true,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    user_id: userId, // Ensure correct type
  };
}

export function createSystemAgent(
  id: string,
  overrides: Partial<TestAgent> = {}
): TestAgent {
  return {
    _id: new Types.ObjectId(),
    agent_id: id,
    name: faker.person.firstName(),
    modelName: 'gemini-2.0-flash',
    ui_color: faker.helpers.arrayElement(UI_COLORS),
    description: faker.lorem.sentence(),
    systemInstruction: faker.lorem.paragraph(),
    isCustom: false,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Pre-defined system agents matching the DEFAULT_AGENTS in constants.ts
export const MOCK_SYSTEM_AGENTS = {
  flash: createSystemAgent('flash', {
    name: 'Flash',
    ui_color: 'blue',
    modelName: 'gemini-2.0-flash',
    description: 'Fast, lightweight responses',
  }),
  sage: createSystemAgent('sage', {
    name: 'Sage',
    ui_color: 'purple',
    modelName: 'gemini-2.0-flash',
    description: 'Deep, analytical responses',
  }),
  proponent: createSystemAgent('proponent', {
    name: 'Proponent',
    ui_color: 'green',
    modelName: 'gemini-2.0-flash',
    description: 'Argues in favor',
  }),
  opponent: createSystemAgent('opponent', {
    name: 'Opponent',
    ui_color: 'rose',
    modelName: 'gemini-2.0-flash',
    description: 'Argues against',
  }),
  moderator: createSystemAgent('moderator', {
    name: 'Moderator',
    ui_color: 'slate',
    modelName: 'gemini-2.0-flash',
    description: 'Summarizes debate',
  }),
  lawyer: createSystemAgent('lawyer', {
    name: 'Lawyer',
    ui_color: 'indigo',
    modelName: 'gemini-2.0-flash',
    description: 'Legal expertise',
  }),
  economist: createSystemAgent('economist', {
    name: 'Economist',
    ui_color: 'emerald',
    modelName: 'gemini-2.0-flash',
    description: 'Economic expertise',
  }),
};
