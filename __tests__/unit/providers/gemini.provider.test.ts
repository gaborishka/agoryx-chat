import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock function for generateContentStream that we can control
const mockGenerateContentStream = vi.fn();

// Mock GoogleGenAI before importing the provider
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContentStream: mockGenerateContentStream,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: { apiKey: string }) {}
  },
}));

import { GeminiProvider } from '@/lib/providers/gemini.provider';
import { getProvider, getProviderFromModel } from '@/lib/providers';

describe('Gemini Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GeminiProvider', () => {
    const createMockStream = (chunks: Array<{ text?: string; usageMetadata?: { totalTokenCount: number } }>) => {
      return {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };
    };

    it('should initialize with API key', () => {
      const provider = new GeminiProvider('test-api-key');
      expect(provider).toBeDefined();
    });

    it('should have name property set to gemini', () => {
      const provider = new GeminiProvider('test-api-key');
      expect(provider.name).toBe('gemini');
    });

    it('should yield text chunks from stream', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([
          { text: 'Hello, ' },
          { text: 'world!' },
          { usageMetadata: { totalTokenCount: 10 } },
        ])
      );

      const provider = new GeminiProvider('test-api-key');
      const chunks: Array<{ type: string; content?: string; totalTokens?: number }> = [];

      for await (const chunk of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Say hello',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'text', content: 'Hello, ' },
        { type: 'text', content: 'world!' },
        { type: 'done', totalTokens: 10 },
      ]);
    });

    it('should build context from history', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Current message',
        history: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      })) {
        // Consume all chunks
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: {
            parts: [
              {
                text: expect.stringContaining('PREVIOUS CONVERSATION:'),
              },
            ],
          },
        })
      );

      const callArg = mockGenerateContentStream.mock.calls[0][0];
      const textPart = callArg.contents.parts[0].text;
      expect(textPart).toContain('User: Hello');
      expect(textPart).toContain('Assistant: Hi there!');
      expect(textPart).toContain('CURRENT TASK:');
      expect(textPart).toContain('Current message');
    });

    it('should truncate history to last 8 messages', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');
      const history = Array.from({ length: 12 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `Message ${i}`,
      }));

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Current',
        history,
      })) {
        // Consume all chunks
      }

      const callArg = mockGenerateContentStream.mock.calls[0][0];
      const textPart = callArg.contents.parts[0].text;

      // Should only have messages 4-11 (last 8)
      expect(textPart).not.toContain('Message 0');
      expect(textPart).not.toContain('Message 3');
      expect(textPart).toContain('Message 4');
      expect(textPart).toContain('Message 11');
    });

    it('should handle image attachments', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Describe this image',
        attachments: [
          { type: 'image', mimeType: 'image/png', data: 'base64data', name: 'test.png' },
        ],
      })) {
        // Consume all chunks
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: 'base64data' } },
              { text: 'Describe this image' },
            ],
          },
        })
      );
    });

    it('should handle PDF attachments', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Summarize this PDF',
        attachments: [
          { type: 'document', mimeType: 'application/pdf', data: 'pdfbase64', name: 'doc.pdf' },
        ],
      })) {
        // Consume all chunks
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: {
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: 'pdfbase64' } },
              { text: 'Summarize this PDF' },
            ],
          },
        })
      );
    });

    it('should handle text file attachments', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Explain this code',
        attachments: [
          { type: 'text', mimeType: 'text/plain', textContent: 'console.log("hello")', name: 'code.js' },
        ],
      })) {
        // Consume all chunks
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: {
            parts: [
              { text: '[File: code.js]\nconsole.log("hello")' },
              { text: 'Explain this code' },
            ],
          },
        })
      );
    });

    it('should pass system instruction', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Hello',
        systemInstruction: 'You are a helpful assistant',
      })) {
        // Consume all chunks
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          config: {
            systemInstruction: 'You are a helpful assistant',
            thinkingConfig: undefined,
          },
        })
      );
    });

    it('should pass thinking budget when provided', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([{ usageMetadata: { totalTokenCount: 5 } }])
      );

      const provider = new GeminiProvider('test-api-key');

      for await (const _ of provider.generateStream({
        model: 'gemini-2.5-flash-thinking',
        prompt: 'Solve this problem',
        thinkingBudget: 2048,
      })) {
        // Consume all chunks
      }

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          config: {
            systemInstruction: undefined,
            thinkingConfig: { thinkingBudget: 2048 },
          },
        })
      );
    });

    it('should yield error chunk when stream throws', async () => {
      mockGenerateContentStream.mockRejectedValue(new Error('API Error'));

      const provider = new GeminiProvider('test-api-key');
      const chunks: Array<{ type: string; error?: string }> = [];

      for await (const chunk of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Hello',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([{ type: 'error', error: 'API Error' }]);
    });

    it('should handle non-Error exceptions', async () => {
      mockGenerateContentStream.mockRejectedValue('string error');

      const provider = new GeminiProvider('test-api-key');
      const chunks: Array<{ type: string; error?: string }> = [];

      for await (const chunk of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Hello',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([{ type: 'error', error: 'Unknown error' }]);
    });

    it('should track total tokens from last chunk', async () => {
      mockGenerateContentStream.mockResolvedValue(
        createMockStream([
          { text: 'Part 1', usageMetadata: { totalTokenCount: 5 } },
          { text: 'Part 2', usageMetadata: { totalTokenCount: 10 } },
          { text: 'Part 3', usageMetadata: { totalTokenCount: 15 } },
        ])
      );

      const provider = new GeminiProvider('test-api-key');
      const chunks: Array<{ type: string; totalTokens?: number }> = [];

      for await (const chunk of provider.generateStream({
        model: 'gemini-2.5-flash',
        prompt: 'Hello',
      })) {
        chunks.push(chunk);
      }

      const doneChunk = chunks.find((c) => c.type === 'done');
      expect(doneChunk?.totalTokens).toBe(15);
    });
  });

  describe('getProvider factory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return GeminiProvider for gemini', () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      const provider = getProvider('gemini');

      expect(provider.name).toBe('gemini');
      expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it('should default to gemini when no provider specified', () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      const provider = getProvider();

      expect(provider.name).toBe('gemini');
    });

    it('should throw error when GEMINI_API_KEY is not set', () => {
      delete process.env.GEMINI_API_KEY;

      expect(() => getProvider('gemini')).toThrow('GEMINI_API_KEY environment variable is not set');
    });

    it('should throw error for unknown provider', () => {
      expect(() => getProvider('unknown')).toThrow('Unknown provider: unknown');
    });
  });

  describe('getProviderFromModel', () => {
    it('should return gemini for gemini models', () => {
      expect(getProviderFromModel('gemini-2.5-flash')).toBe('gemini');
      expect(getProviderFromModel('gemini-3-pro')).toBe('gemini');
      expect(getProviderFromModel('gemini-2.5-flash-thinking')).toBe('gemini');
    });

    it('should return openai for gpt models', () => {
      expect(getProviderFromModel('gpt-4')).toBe('openai');
      expect(getProviderFromModel('gpt-4-turbo')).toBe('openai');
      expect(getProviderFromModel('gpt-3.5-turbo')).toBe('openai');
    });

    it('should return openai for o1 models', () => {
      expect(getProviderFromModel('o1-preview')).toBe('openai');
      expect(getProviderFromModel('o1-mini')).toBe('openai');
    });

    it('should return claude for claude models', () => {
      expect(getProviderFromModel('claude-3-opus')).toBe('claude');
      expect(getProviderFromModel('claude-3-sonnet')).toBe('claude');
      expect(getProviderFromModel('claude-3-haiku')).toBe('claude');
    });

    it('should default to gemini for unknown models', () => {
      expect(getProviderFromModel('custom-model')).toBe('gemini');
      expect(getProviderFromModel('llama-2')).toBe('gemini');
    });
  });
});
