/**
 * Azure OpenAI Provider
 * Supports GPT-5 models via Azure AI Foundry
 *
 * @see https://learn.microsoft.com/en-us/javascript/api/overview/azure/openai-readme
 * @see https://github.com/openai/openai-node/blob/master/azure.md
 */
import { AzureOpenAI } from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import type { AIProvider, GenerateConfig, StreamChunk } from './types';
import { MAX_HISTORY_MESSAGES } from './types';

// Default API version - use latest GA version
const DEFAULT_API_VERSION = '2024-10-21';

/**
 * Get deployment name from model string
 * Reads from environment variables at runtime (not module load)
 */
function getDeploymentName(model: string): string {
  const deploymentMap: Record<string, string | undefined> = {
    'azure-gpt-5': process.env.AZURE_OPENAI_DEPLOYMENT_GPT5,
    'azure-gpt-5-mini': process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_MINI,
    'azure-gpt-5-nano': process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_NANO,
    'azure-gpt-5-chat': process.env.AZURE_OPENAI_DEPLOYMENT_GPT5_CHAT,
  };

  // Return configured deployment or extract from model name
  return deploymentMap[model] || model.replace('azure-', '');
}

export class AzureProvider implements AIProvider {
  readonly name = 'azure';
  private apiKey: string;
  private endpoint: string;
  private apiVersion: string;
  // Cache clients per deployment to avoid recreating them
  private clientCache: Map<string, AzureOpenAI> = new Map();

  constructor(
    apiKey: string,
    endpoint: string,
    apiVersion?: string
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
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
    const deployment = getDeploymentName(model);
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
        model: deployment, // Azure uses deployment name as model
        messages,
        stream: true,
        // Include usage stats in the final streaming chunk
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
        error instanceof Error ? error.message : 'Unknown Azure OpenAI error';
      yield { type: 'error', error: message };
    }
  }
}
