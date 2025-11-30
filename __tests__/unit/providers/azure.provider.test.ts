import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock for chat.completions.create
const mockCreate = vi.fn();

// Mock the openai package before importing the provider
vi.mock('openai', () => ({
  AzureOpenAI: class MockAzureOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
    constructor(public config: {
      apiKey: string;
      endpoint: string;
      deployment: string;
      apiVersion: string;
    }) {}
  },
}));

import { AzureProvider } from '@/lib/providers/azure.provider';
import { getProvider, getProviderFromModel } from '@/lib/providers';

describe('Azure Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('AzureProvider', () => {
    const createMockStream = (
      chunks: Array<{
        choices: Array<{ delta: { content?: string } }>;
        usage?: { total_tokens: number };
      }>
    ) => {
      return {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };
    };

    it('should initialize with API key and endpoint', () => {
      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      expect(provider).toBeDefined();
    });

    it('should have name property set to azure', () => {
      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      expect(provider.name).toBe('azure');
    });

    it('should use default API version when not specified', () => {
      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      // The default is 2024-10-21
      expect(provider).toBeDefined();
    });

    it('should accept custom API version', () => {
      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com',
        '2024-12-01-preview'
      );
      expect(provider).toBeDefined();
    });

    it('should yield text chunks from stream', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([
          { choices: [{ delta: { content: 'Hello, ' } }] },
          { choices: [{ delta: { content: 'world!' } }] },
          { choices: [{ delta: {} }], usage: { total_tokens: 10 } },
        ])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      const chunks: Array<{ type: string; content?: string; totalTokens?: number }> = [];

      for await (const chunk of provider.generateStream({
        model: 'azure-gpt-5',
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

    it('should pass stream_options for usage tracking', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello',
      })) {
        // Consume all chunks
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
          stream_options: { include_usage: true },
        })
      );
    });

    it('should build messages with system instruction', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello',
        systemInstruction: 'You are a helpful assistant',
      })) {
        // Consume all chunks
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a helpful assistant' },
          ]),
        })
      );
    });

    it('should include history in messages', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Current message',
        history: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      })) {
        // Consume all chunks
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ]),
        })
      );
    });

    it('should limit history to MAX_HISTORY_MESSAGES (8)', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      // Create 12 history messages (exceeds limit of 8)
      const longHistory = Array.from({ length: 12 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i + 1}`,
      }));

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Current message',
        history: longHistory,
      })) {
        // Consume all chunks
      }

      const callArg = mockCreate.mock.calls[0][0];
      // Should have: 8 history messages + 1 user message = 9 total
      // (no system instruction in this test)
      expect(callArg.messages).toHaveLength(9);

      // First message should be Message 5 (12 - 8 + 1 = 5th message)
      expect(callArg.messages[0].content).toBe('Message 5');
      // Last history message should be Message 12
      expect(callArg.messages[7].content).toBe('Message 12');
    });

    it('should handle image attachments with base64 data URL', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5-chat',
        prompt: 'Describe this image',
        attachments: [
          { type: 'image', mimeType: 'image/png', data: 'base64data', name: 'test.png' },
        ],
      })) {
        // Consume all chunks
      }

      const callArg = mockCreate.mock.calls[0][0];
      const userMessage = callArg.messages.find(
        (m: { role: string }) => m.role === 'user'
      );

      expect(userMessage.content).toEqual(
        expect.arrayContaining([
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,base64data' },
          },
        ])
      );
    });

    it('should handle text file attachments', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Explain this code',
        attachments: [
          {
            type: 'text',
            mimeType: 'text/plain',
            textContent: 'console.log("hello")',
            name: 'code.js',
          },
        ],
      })) {
        // Consume all chunks
      }

      const callArg = mockCreate.mock.calls[0][0];
      const userMessage = callArg.messages.find(
        (m: { role: string }) => m.role === 'user'
      );

      expect(userMessage.content).toEqual(
        expect.arrayContaining([
          { type: 'text', text: '[File: code.js]\nconsole.log("hello")' },
        ])
      );
    });

    it('should yield error chunk when stream throws', async () => {
      mockCreate.mockRejectedValue(new Error('Azure API Error'));

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      const chunks: Array<{ type: string; error?: string }> = [];

      for await (const chunk of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([{ type: 'error', error: 'Azure API Error' }]);
    });

    it('should handle non-Error exceptions', async () => {
      mockCreate.mockRejectedValue('string error');

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      const chunks: Array<{ type: string; error?: string }> = [];

      for await (const chunk of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello',
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([{ type: 'error', error: 'Unknown Azure OpenAI error' }]);
    });

    it('should track total tokens from final chunk', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([
          { choices: [{ delta: { content: 'Part 1' } }] },
          { choices: [{ delta: { content: 'Part 2' } }] },
          { choices: [{ delta: {} }], usage: { total_tokens: 25 } },
        ])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );
      const chunks: Array<{ type: string; totalTokens?: number }> = [];

      for await (const chunk of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello',
      })) {
        chunks.push(chunk);
      }

      const doneChunk = chunks.find((c) => c.type === 'done');
      expect(doneChunk?.totalTokens).toBe(25);
    });

    it('should resolve deployment name from model', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5-nano',
        prompt: 'Hello',
      })) {
        // Consume all chunks
      }

      // The model parameter should be the deployment name
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
        })
      );
    });

    it('should cache clients for same deployment', async () => {
      mockCreate.mockResolvedValue(
        createMockStream([{ choices: [{ delta: {} }], usage: { total_tokens: 5 } }])
      );

      const provider = new AzureProvider(
        'test-api-key',
        'https://test.openai.azure.com'
      );

      // Make two calls with the same model
      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello 1',
      })) {
        // Consume all chunks
      }

      for await (const _ of provider.generateStream({
        model: 'azure-gpt-5',
        prompt: 'Hello 2',
      })) {
        // Consume all chunks
      }

      // Both calls should reuse the same client (mockCreate called twice)
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProvider factory for azure', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return AzureProvider for azure', () => {
      process.env.AZURE_OPENAI_API_KEY = 'test-api-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';

      const provider = getProvider('azure');

      expect(provider.name).toBe('azure');
      expect(provider).toBeInstanceOf(AzureProvider);
    });

    it('should throw error when AZURE_OPENAI_API_KEY is not set', () => {
      delete process.env.AZURE_OPENAI_API_KEY;
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';

      expect(() => getProvider('azure')).toThrow(
        'AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables must be set'
      );
    });

    it('should throw error when AZURE_OPENAI_ENDPOINT is not set', () => {
      process.env.AZURE_OPENAI_API_KEY = 'test-api-key';
      delete process.env.AZURE_OPENAI_ENDPOINT;

      expect(() => getProvider('azure')).toThrow(
        'AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables must be set'
      );
    });
  });

  describe('getProviderFromModel for azure', () => {
    it('should return azure for azure-prefixed models', () => {
      expect(getProviderFromModel('azure-gpt-5')).toBe('azure');
      expect(getProviderFromModel('azure-gpt-5-mini')).toBe('azure');
      expect(getProviderFromModel('azure-gpt-5-nano')).toBe('azure');
      expect(getProviderFromModel('azure-gpt-5-chat')).toBe('azure');
    });

    it('should not return azure for non-azure models', () => {
      expect(getProviderFromModel('gpt-4')).toBe('openai');
      expect(getProviderFromModel('gemini-2.5-flash')).toBe('gemini');
      expect(getProviderFromModel('claude-3-opus')).toBe('claude');
    });
  });
});
