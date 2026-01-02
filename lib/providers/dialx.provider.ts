/**
 * DialX (AI DIAL) Provider
 * Aggregator platform with Azure OpenAI-compatible API providing access to
 * models from multiple providers (OpenAI, Anthropic, Google, Meta, etc.)
 *
 * Uses Azure OpenAI SDK format with Api-Key header authentication.
 *
 * @see https://docs.dialx.ai/
 */
import { AzureOpenAI } from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import type { AIProvider, GenerateConfig, StreamChunk } from './types';
import { MAX_HISTORY_MESSAGES } from './types';

// Default endpoint for DialX API
// URL format: {endpoint}/openai/deployments/{model}/chat/completions?api-version=1
const DEFAULT_ENDPOINT = 'https://ai-proxy.lab.epam.com';
const DEFAULT_API_VERSION = '1';

/**
 * Extract the actual model/deployment name by removing the 'dialx-' prefix
 * @param model - Model string with dialx- prefix (e.g., 'dialx-gpt-4o-mini')
 * @returns Clean deployment name for API call (e.g., 'gpt-4o-mini-2024-07-18')
 */
function extractDeploymentName(model: string): string {
  return model.startsWith('dialx-') ? model.slice(6) : model;
}

export class DialXProvider implements AIProvider {
  readonly name = 'dialx';
  private endpoint: string;
  private apiKey: string;
  private apiVersion: string;
  // Cache clients per deployment to avoid recreating them
  private clientCache: Map<string, AzureOpenAI> = new Map();

  constructor(apiKey: string, endpoint?: string, apiVersion?: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint || DEFAULT_ENDPOINT;
    this.apiVersion = apiVersion || DEFAULT_API_VERSION;
  }

  private getClient(deployment: string): AzureOpenAI {
    // Return cached client if available
    const cacheKey = `${this.endpoint}:${deployment}`;
    let client = this.clientCache.get(cacheKey);

    if (!client) {
      client = new AzureOpenAI({
        apiKey: this.apiKey,
        endpoint: this.endpoint,
        deployment,
        apiVersion: this.apiVersion,
      });
      this.clientCache.set(cacheKey, client);
    }

    return client;
  }

  async *generateStream(config: GenerateConfig): AsyncGenerator<StreamChunk> {
    const { model, prompt, systemInstruction, history, attachments } = config;
    const deployment = extractDeploymentName(model);
    const client = this.getClient(deployment);

    // Build messages array
    const messages: ChatCompletionMessageParam[] = [];

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }

    // Add history (limit to last N messages to prevent token overflow)
    if (history) {
      const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
      recentHistory.forEach((msg) => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });
    }

    // Build user message with attachments
    const content: ChatCompletionContentPart[] = [];
    if (attachments) {
      attachments.forEach((att) => {
        if (att.type === 'image' && att.data) {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.data}` },
          });
        } else if (att.textContent) {
          content.push({
            type: 'text',
            text: `[File: ${att.name}]\n${att.textContent}`,
          });
        }
      });
    }
    content.push({ type: 'text', text: prompt });

    messages.push({ role: 'user', content });

    try {
      const stream = await client.chat.completions.create({
        model: deployment,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      });

      let totalTokens = 0;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield { type: 'text', content: delta };
        }
        // Usage is included in the final chunk when stream_options.include_usage is true
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
        }
      }
      yield { type: 'done', totalTokens };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown DialX error';
      yield { type: 'error', error: message };
    }
  }
}
