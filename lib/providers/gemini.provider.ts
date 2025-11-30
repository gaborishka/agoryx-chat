import { GoogleGenAI } from '@google/genai';
import { AIProvider, GenerateConfig, StreamChunk, MAX_HISTORY_MESSAGES } from './types';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async *generateStream(config: GenerateConfig): AsyncGenerator<StreamChunk> {
    const { model, prompt, systemInstruction, history, attachments, thinkingBudget } = config;

    try {
      // Build context from history (limit to last N messages to prevent token overflow)
      const contextText = history
        ?.slice(-MAX_HISTORY_MESSAGES)
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const fullPromptText = contextText
        ? `PREVIOUS CONVERSATION:\n${contextText}\n\nCURRENT TASK:\n${prompt}`
        : prompt;

      // Build parts array
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (attachments) {
        attachments.forEach((att) => {
          if (att.data && (att.type === 'image' || att.mimeType === 'application/pdf')) {
            parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
          } else if (att.textContent) {
            parts.push({ text: `[File: ${att.name}]\n${att.textContent}` });
          }
        });
      }
      parts.push({ text: fullPromptText });

      // Stream the response
      const stream = await this.client.models.generateContentStream({
        model,
        contents: { parts },
        config: {
          systemInstruction: systemInstruction || undefined,
          thinkingConfig: thinkingBudget ? { thinkingBudget } : undefined,
        },
      });

      let totalTokens = 0;

      for await (const chunk of stream) {
        if (chunk.text) {
          yield { type: 'text', content: chunk.text };
        }
        if (chunk.usageMetadata?.totalTokenCount) {
          totalTokens = chunk.usageMetadata.totalTokenCount;
        }
      }

      yield { type: 'done', totalTokens };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
