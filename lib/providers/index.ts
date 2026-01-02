import { AIProvider } from './types';
import { GeminiProvider } from './gemini.provider';
import { AzureProvider } from './azure.provider';
import { DialXProvider } from './dialx.provider';

export * from './types';
export { GeminiProvider, AzureProvider, DialXProvider };

/**
 * Factory function to get an AI provider instance
 * @param providerName - Name of the provider ('gemini', 'azure', 'openai', 'claude')
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
    case 'azure': {
      const azureKey = process.env.AZURE_OPENAI_API_KEY;
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;
      if (!azureKey || !azureEndpoint) {
        throw new Error(
          'AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables must be set'
        );
      }
      return new AzureProvider(azureKey, azureEndpoint, azureApiVersion);
    }
    case 'dialx': {
      const dialxKey = process.env.DIALX_API_KEY;
      const dialxEndpoint = process.env.DIALX_ENDPOINT;
      const dialxApiVersion = process.env.DIALX_API_VERSION;
      if (!dialxKey) {
        throw new Error('DIALX_API_KEY environment variable is not set');
      }
      return new DialXProvider(dialxKey, dialxEndpoint, dialxApiVersion);
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
  if (model.startsWith('azure-')) return 'azure';
  if (model.startsWith('dialx-')) return 'dialx';
  if (model.startsWith('gpt') || model.startsWith('o1')) return 'openai';
  if (model.startsWith('claude')) return 'claude';
  return 'gemini'; // Default to Gemini
}
