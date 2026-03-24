import Anthropic from '@anthropic-ai/sdk';

let claudeClient: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  if (!claudeClient) {
    claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return claudeClient;
}

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
export const MAX_TOKENS = 8192;
