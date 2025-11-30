/**
 * AI Provider Abstraction Layer
 * Enables multi-provider support (Gemini, OpenAI, Claude, etc.)
 */

export interface Attachment {
  type: string;
  mimeType: string;
  data?: string;
  textContent?: string;
  name: string;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateConfig {
  model: string;
  prompt: string;
  systemInstruction?: string;
  history?: HistoryMessage[];
  attachments?: Attachment[];
  thinkingBudget?: number;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  totalTokens?: number;
  error?: string;
}

export interface AIProvider {
  readonly name: string;
  generateStream(config: GenerateConfig): AsyncGenerator<StreamChunk>;
}
