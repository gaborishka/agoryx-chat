import { AIProvider } from './types';
import { GeminiProvider } from './gemini.provider';

export * from './types';
export { GeminiProvider };

/**
 * Factory function to get an AI provider instance
 * @param providerName - Name of the provider ('gemini', 'openai', 'claude')
 * @returns AIProvider instance
 */
export function getProvider(providerName: string = 'gemini'): AIProvider {
  switch (providerName) {
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }
      return new GeminiProvider(apiKey);
    }
    // Future providers:
    // case 'openai':
    //   return new OpenAIProvider(process.env.OPENAI_API_KEY!);
    // case 'claude':
    //   return new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Get provider name from model string
 * Infers provider based on model naming conventions
 */
export function getProviderFromModel(model: string): string {
  if (model.startsWith('gemini')) return 'gemini';
  if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
  if (model.startsWith('claude')) return 'claude';
  return 'gemini'; // Default to Gemini
}
