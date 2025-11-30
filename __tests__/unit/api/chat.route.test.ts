import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock function for generateContent that we can control
const mockGenerateContent = vi.fn();

// Mock the provider
vi.mock('@/lib/providers', () => ({
  getProvider: vi.fn(),
}));

// Mock GoogleGenAI with a class
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: { apiKey: string }) {}
  },
}));

import { POST, PUT } from '@/app/api/chat/route';
import { getProvider } from '@/lib/providers';

const mockGetProvider = vi.mocked(getProvider);

describe('Chat API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/chat', () => {
    const createMockProvider = (chunks: Array<{ type: string; content?: string; totalTokens?: number; error?: string }>) => ({
      generateStream: vi.fn().mockImplementation(async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      }),
    });

    it('should stream text response successfully', async () => {
      const mockProvider = createMockProvider([
        { type: 'text', content: 'Hello, ' },
        { type: 'text', content: 'world!' },
        { type: 'done', totalTokens: 10 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Say hello',
          history: [],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');

      // Read the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).toContain('data: {"type":"text","content":"Hello, "}');
      expect(result).toContain('data: {"type":"text","content":"world!"}');
      expect(result).toContain('data: {"type":"done","totalTokens":10}');
    });

    it('should use default model when not specified', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
        })
      );
    });

    it('should pass custom model when specified', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
          model: 'gemini-3-pro',
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-pro',
        })
      );
    });

    it('should truncate history to last 8 messages', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const history = Array.from({ length: 12 }, (_, i) => ({
        sender_type: i % 2 === 0 ? 'user' : 'agent',
        sender_id: i % 2 === 0 ? 'user-1' : 'flash',
        content: `Message ${i}`,
      }));

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history,
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          history: expect.arrayContaining([
            expect.objectContaining({ content: 'Message 4' }),
            expect.objectContaining({ content: 'Message 11' }),
          ]),
        })
      );

      const callArg = mockProvider.generateStream.mock.calls[0][0];
      expect(callArg.history).toHaveLength(8);
    });

    it('should convert history sender_type to role correctly', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [
            { sender_type: 'user', sender_id: 'user-1', content: 'Hello' },
            { sender_type: 'agent', sender_id: 'flash', content: 'Hi!' },
          ],
        }),
      });

      await POST(request);

      const callArg = mockProvider.generateStream.mock.calls[0][0];
      expect(callArg.history).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ]);
    });

    it('should pass systemInstruction when provided', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
          systemInstruction: 'Be helpful',
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: 'Be helpful',
        })
      );
    });

    it('should not pass systemInstruction when empty string', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
          systemInstruction: '',
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: undefined,
        })
      );
    });

    it('should pass attachments when provided', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const attachments = [
        { type: 'image', mimeType: 'image/png', data: 'base64data', name: 'test.png' },
      ];

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Check this image',
          history: [],
          attachments,
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments,
        })
      );
    });

    it('should set thinkingBudget when isThinkingModel is true', async () => {
      const mockProvider = createMockProvider([
        { type: 'done', totalTokens: 5 },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
          isThinkingModel: true,
        }),
      });

      await POST(request);

      expect(mockProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          thinkingBudget: 2048,
        })
      );
    });

    it('should stream error events when provider yields error', async () => {
      const mockProvider = createMockProvider([
        { type: 'text', content: 'Partial ' },
        { type: 'error', error: 'Provider error' },
      ]);
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
        }),
      });

      const response = await POST(request);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).toContain('data: {"type":"error","message":"Provider error"}');
    });

    it('should handle provider throwing error', async () => {
      const mockProvider = {
        generateStream: vi.fn().mockImplementation(async function* () {
          yield { type: 'text', content: 'Start' };
          throw new Error('Stream error');
        }),
      };
      mockGetProvider.mockReturnValue(mockProvider as ReturnType<typeof getProvider>);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test',
          history: [],
        }),
      });

      const response = await POST(request);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).toContain('data: {"type":"error","message":"Stream error"}');
    });

    it('should return 500 for invalid JSON body', async () => {
      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('PUT /api/chat (voice transcription)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return 500 when API key not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'PUT',
        body: JSON.stringify({
          audioBase64: 'base64audiodata',
          mimeType: 'audio/webm',
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('API key not configured');
    });

    it('should transcribe audio successfully', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      mockGenerateContent.mockResolvedValue({
        text: 'Transcribed text from audio',
      });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'PUT',
        body: JSON.stringify({
          audioBase64: 'base64audiodata',
          mimeType: 'audio/webm',
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.text).toBe('Transcribed text from audio');

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/webm', data: 'base64audiodata' } },
            { text: 'Transcribe this audio exactly.' },
          ],
        },
      });
    });

    it('should return empty string when response text is undefined', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      mockGenerateContent.mockResolvedValue({
        text: undefined,
      });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'PUT',
        body: JSON.stringify({
          audioBase64: 'base64audiodata',
          mimeType: 'audio/webm',
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.text).toBe('');
    });

    it('should handle transcription error', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      mockGenerateContent.mockRejectedValue(new Error('Transcription API error'));

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'PUT',
        body: JSON.stringify({
          audioBase64: 'base64audiodata',
          mimeType: 'audio/webm',
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Transcription API error');
    });

    it('should handle non-Error thrown exception', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      mockGenerateContent.mockRejectedValue('string error');

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'PUT',
        body: JSON.stringify({
          audioBase64: 'base64audiodata',
          mimeType: 'audio/webm',
        }),
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Transcription failed');
    });

    it('should handle invalid JSON body', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'PUT',
        body: 'invalid json',
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });
});
